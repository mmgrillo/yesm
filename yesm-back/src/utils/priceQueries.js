// src/utils/priceQueries.js
const { pool } = require('../database/schema');
const logger = require('./logger');

class PriceQueryService {
  async getPriceAtTime(symbol, chain, timestamp) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH token_price AS (
          SELECT price, timestamp,
                 EXTRACT(EPOCH FROM ABS(timestamp - $3::timestamp)) as time_diff
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp <= $3::timestamp
          ORDER BY timestamp DESC
          LIMIT 1
        )
        SELECT 
          price,
          timestamp,
          CASE 
            WHEN time_diff > 3600 THEN true 
            ELSE false 
          END as price_might_be_stale
        FROM token_price
      `, [symbol, chain, timestamp]);

      if (!result.rows[0]) {
        throw new Error(`No price found for ${symbol} at ${timestamp}`);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPriceRange(symbol, chain, startTime, endTime, interval = '1 hour') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH time_buckets AS (
          SELECT 
            time_bucket($4::interval, timestamp) as bucket,
            token_id,
            FIRST_VALUE(price) OVER (PARTITION BY time_bucket($4::interval, timestamp) ORDER BY timestamp) as open_price,
            MAX(price) as high_price,
            MIN(price) as low_price,
            LAST_VALUE(price) OVER (
              PARTITION BY time_bucket($4::interval, timestamp) 
              ORDER BY timestamp
              RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
            ) as close_price,
            AVG(price) as avg_price,
            COUNT(*) as data_points
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp BETWEEN $3::timestamp AND $5::timestamp
          GROUP BY time_bucket($4::interval, timestamp), token_id
        )
        SELECT 
          bucket as timestamp,
          open_price,
          high_price,
          low_price,
          close_price,
          avg_price,
          data_points,
          CASE 
            WHEN data_points < EXTRACT(EPOCH FROM $4::interval)/60 * 0.8 THEN true 
            ELSE false 
          END as has_gaps
        FROM time_buckets
        ORDER BY bucket
      `, [symbol, chain, startTime, interval, endTime]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTokenPerformance(symbol, chain, periods = ['1d', '7d', '30d', '90d', '1y']) {
    const client = await pool.connect();
    try {
      const performanceData = {};
      const now = new Date();

      for (const period of periods) {
        const intervalMap = {
          '1d': '1 day',
          '7d': '7 days',
          '30d': '30 days',
          '90d': '90 days',
          '1y': '1 year'
        };

        const result = await client.query(`
          WITH current_price AS (
            SELECT price 
            FROM token_prices tp
            JOIN tokens t ON t.id = tp.token_id
            WHERE t.symbol = $1 
            AND t.chain = $2
            ORDER BY timestamp DESC
            LIMIT 1
          ),
          period_start_price AS (
            SELECT price
            FROM token_prices tp
            JOIN tokens t ON t.id = tp.token_id
            WHERE t.symbol = $1 
            AND t.chain = $2
            AND timestamp <= NOW() - $3::interval
            ORDER BY timestamp DESC
            LIMIT 1
          )
          SELECT 
            current_price.price as current_price,
            period_start_price.price as period_start_price,
            ((current_price.price - period_start_price.price) / period_start_price.price * 100) as percent_change
          FROM current_price, period_start_price
        `, [symbol, chain, intervalMap[period]]);

        performanceData[period] = result.rows[0] || null;
      }

      return performanceData;
    } finally {
      client.release();
    }
  }

  async validatePriceData(symbol, chain, timeWindow = '24 hours') {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH price_stats AS (
          SELECT 
            COUNT(*) as data_points,
            MAX(timestamp) as last_update,
            MAX(ABS(price - LAG(price) OVER (ORDER BY timestamp))) as max_price_jump,
            AVG(price) as avg_price,
            STDDEV(price) as price_stddev,
            COUNT(DISTINCT DATE_TRUNC('hour', timestamp)) as hours_with_data
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp > NOW() - $3::interval
        )
        SELECT 
          data_points,
          last_update,
          max_price_jump,
          avg_price,
          price_stddev,
          hours_with_data,
          EXTRACT(EPOCH FROM NOW() - last_update)/60 as minutes_since_update,
          CASE 
            WHEN data_points < EXTRACT(EPOCH FROM $3::interval)/300 * 0.8 THEN 'Missing data points'
            WHEN EXTRACT(EPOCH FROM NOW() - last_update)/60 > 10 THEN 'Stale data'
            ELSE 'OK'
          END as status
        FROM price_stats
      `, [symbol, chain, timeWindow]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = new PriceQueryService();