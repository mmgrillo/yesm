// src/validation/priceValidation.js
const { pool } = require('../database/schema');
const logger = require('../utils/logger');

class PriceValidation {
  async runFullValidation() {
    const client = await pool.connect();
    const issues = [];
    
    try {
      // Check for data gaps
      const gapResults = await client.query(`
        WITH time_series AS (
          SELECT 
            token_id,
            timestamp,
            LEAD(timestamp) OVER (PARTITION BY token_id ORDER BY timestamp) as next_timestamp
          FROM token_prices
          WHERE timestamp > NOW() - INTERVAL '2 years'
        )
        SELECT 
          t.symbol,
          t.chain,
          ts.timestamp as gap_start,
          ts.next_timestamp as gap_end,
          EXTRACT(EPOCH FROM (ts.next_timestamp - ts.timestamp))/60 as gap_minutes
        FROM time_series ts
        JOIN tokens t ON t.id = ts.token_id
        WHERE EXTRACT(EPOCH FROM (next_timestamp - timestamp))/60 > 10
        ORDER BY gap_minutes DESC
        LIMIT 100
      `);

      if (gapResults.rows.length > 0) {
        issues.push({
          type: 'data_gaps',
          details: gapResults.rows
        });
      }

      // Check for price anomalies
      const anomalyResults = await client.query(`
        WITH price_changes AS (
          SELECT 
            token_id,
            timestamp,
            price,
            LAG(price) OVER (PARTITION BY token_id ORDER BY timestamp) as prev_price,
            LAG(timestamp) OVER (PARTITION BY token_id ORDER BY timestamp) as prev_timestamp
          FROM token_prices
          WHERE timestamp > NOW() - INTERVAL '2 years'
        )
        SELECT 
          t.symbol,
          t.chain,
          pc.timestamp,
          pc.price,
          pc.prev_price,
          ABS((pc.price - pc.prev_price) / pc.prev_price * 100) as price_change_percent
        FROM price_changes pc
        JOIN tokens t ON t.id = pc.token_id
        WHERE ABS((price - prev_price) / prev_price * 100) > 20
        ORDER BY price_change_percent DESC
        LIMIT 100
      `);

      if (anomalyResults.rows.length > 0) {
        issues.push({
          type: 'price_anomalies',
          details: anomalyResults.rows
        });
      }

      // Check for data consistency
      const consistencyResults = await client.query(`
        SELECT 
          t.symbol,
          t.chain,
          COUNT(*) as data_points,
          MIN(timestamp) as earliest_data,
          MAX(timestamp) as latest_data,
          COUNT(DISTINCT DATE_TRUNC('day', timestamp)) as days_with_data,
          COUNT(*) / EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 * 100 as data_completeness_percent
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE timestamp > NOW() - INTERVAL '2 years'
        GROUP BY t.id, t.symbol, t.chain
        HAVING COUNT(*) / EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 * 100 < 95
      `);

      if (consistencyResults.rows.length > 0) {
        issues.push({
          type: 'data_consistency',
          details: consistencyResults.rows
        });
      }

      return {
        hasIssues: issues.length > 0,
        issues,
        summary: {
          gaps: gapResults.rows.length,
          anomalies: anomalyResults.rows.length,
          consistencyIssues: consistencyResults.rows.length
        }
      };

    } catch (error) {
      logger.error('Error during price data validation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async validatePricePoint(symbol, chain, timestamp, price) {
    const client = await pool.connect();
    try {
      // Get surrounding prices for context
      const result = await client.query(`
        WITH context_prices AS (
          SELECT 
            price,
            timestamp,
            AVG(price) OVER (
              ORDER BY timestamp
              ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING
            ) as avg_price,
            STDDEV(price) OVER (
              ORDER BY timestamp
              ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING
            ) as stddev_price
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp BETWEEN $3::timestamp - INTERVAL '1 hour'
            AND $3::timestamp + INTERVAL '1 hour'
        )
        SELECT 
          AVG(price) as avg_price,
          STDDEV(price) as stddev_price,
          COUNT(*) as context_points
        FROM context_prices
      `, [symbol, chain, timestamp]);

      if (result.rows[0].context_points < 3) {
        return {
          isValid: false,
          reason: 'Insufficient context data',
          details: result.rows[0]
        };
      }

      const { avg_price, stddev_price } = result.rows[0];
      const zScore = Math.abs((price - avg_price) / (stddev_price || 1));

      return {
        isValid: zScore <= 3, // Within 3 standard deviations
        zScore,
        avgPrice: avg_price,
        stdDev: stddev_price,
        details: {
          timestamp,
          price,
          contextData: result.rows[0]
        }
      };
    } finally {
      client.release();
    }
  }

  async checkDataCompleteness(startTime, endTime) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH expected_minutes AS (
          SELECT generate_series(
            DATE_TRUNC('minute', $1::timestamp),
            DATE_TRUNC('minute', $2::timestamp),
            '1 minute'::interval
          ) as minute
        ),
        completeness_check AS (
          SELECT 
            t.symbol,
            t.chain,
            COUNT(DISTINCT e.minute) as expected_points,
            COUNT(DISTINCT tp.timestamp) as actual_points,
            COUNT(DISTINCT tp.timestamp)::float / COUNT(DISTINCT e.minute) * 100 as completeness_percent
          FROM expected_minutes e
          CROSS JOIN tokens t
          LEFT JOIN token_prices tp ON DATE_TRUNC('minute', tp.timestamp) = e.minute
            AND tp.token_id = t.id
          GROUP BY t.id, t.symbol, t.chain
        )
        SELECT *,
          CASE 
            WHEN completeness_percent >= 99 THEN 'Excellent'
            WHEN completeness_percent >= 95 THEN 'Good'
            WHEN completeness_percent >= 90 THEN 'Fair'
            ELSE 'Poor'
          END as quality_rating
        FROM completeness_check
        ORDER BY completeness_percent DESC
      `, [startTime, endTime]);

      return {
        overallCompleteness: result.rows.reduce((acc, row) => acc + row.completeness_percent, 0) / result.rows.length,
        tokenStats: result.rows,
        startTime,
        endTime
      };
    } finally {
      client.release();
    }
  }

  async validatePriceSequence(symbol, chain, timeWindow = '24 hours') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH price_sequence AS (
          SELECT 
            timestamp,
            price,
            LAG(price) OVER (ORDER BY timestamp) as prev_price,
            LEAD(price) OVER (ORDER BY timestamp) as next_price,
            timestamp - LAG(timestamp) OVER (ORDER BY timestamp) as time_gap,
            LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp as next_gap
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp > NOW() - $3::interval
        )
        SELECT 
          timestamp,
          price,
          CASE 
            WHEN ABS((price - prev_price) / prev_price) > 0.2 THEN true
            WHEN ABS((price - next_price) / next_price) > 0.2 THEN true
            WHEN time_gap > INTERVAL '10 minutes' THEN true
            WHEN next_gap > INTERVAL '10 minutes' THEN true
            ELSE false
          END as needs_verification,
          EXTRACT(EPOCH FROM time_gap) as seconds_since_previous,
          EXTRACT(EPOCH FROM next_gap) as seconds_until_next,
          ABS((price - prev_price) / prev_price) * 100 as pct_change_from_prev,
          ABS((price - next_price) / next_price) * 100 as pct_change_to_next
        FROM price_sequence
        WHERE 
          ABS((price - prev_price) / prev_price) > 0.2
          OR ABS((price - next_price) / next_price) > 0.2
          OR time_gap > INTERVAL '10 minutes'
          OR next_gap > INTERVAL '10 minutes'
        ORDER BY timestamp
      `, [symbol, chain, timeWindow]);

      return {
        suspiciousPoints: result.rows,
        summary: {
          totalSuspiciousPoints: result.rows.length,
          largestGap: Math.max(...result.rows.map(r => r.seconds_since_previous || 0)),
          largestPriceChange: Math.max(...result.rows.map(r => r.pct_change_from_prev || 0))
        }
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new PriceValidation();