// src/monitoring/priceMonitor.js
const cron = require('node-cron');
const { pool } = require('../database/schema');
const priceQueries = require('../utils/priceQueries');
const logger = require('../utils/logger');

class PriceMonitor {
  constructor(config = {}) {
    this.config = {
      maxPriceChange: 20, // Maximum allowed % change in 5 minutes
      maxDataGap: 10, // Maximum allowed minutes between updates
      minDataPoints: 280, // Minimum data points per 24h (95% of expected)
      alertChannels: ['log', 'email'], // Add more channels as needed
      ...config
    };
  }

  async sendAlert(level, message, details) {
    // Log alert
    logger[level](message, details);

    // You can add more alert channels here (email, Slack, etc.)
    if (this.config.alertChannels.includes('email') && level === 'error') {
      // Example email alert integration
      // await sendEmail({
      //   subject: `Price Monitor Alert: ${message}`,
      //   body: JSON.stringify(details, null, 2)
      // });
    }
  }

  async checkPriceAnomaly(symbol, chain) {
    try {
      const result = await pool.query(`
        WITH recent_prices AS (
          SELECT 
            timestamp,
            price,
            LAG(price) OVER (ORDER BY timestamp) as prev_price,
            LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
          FROM token_prices tp
          JOIN tokens t ON t.id = tp.token_id
          WHERE t.symbol = $1 
          AND t.chain = $2
          AND timestamp > NOW() - INTERVAL '1 hour'
          ORDER BY timestamp DESC
          LIMIT 2
        )
        SELECT 
          timestamp,
          price,
          prev_price,
          EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/60 as minutes_gap,
          ABS((price - prev_price) / prev_price * 100) as price_change_percent
        FROM recent_prices
        WHERE prev_price IS NOT NULL
      `, [symbol, chain]);

      if (result.rows.length > 0) {
        const { price_change_percent, minutes_gap } = result.rows[0];

        if (price_change_percent > this.config.maxPriceChange) {
          await this.sendAlert('error', 'Unusual price movement detected', {
            symbol,
            chain,
            price_change_percent,
            threshold: this.config.maxPriceChange
          });
        }

        if (minutes_gap > this.config.maxDataGap) {
          await this.sendAlert('warn', 'Data gap detected', {
            symbol,
            chain,
            minutes_gap,
            threshold: this.config.maxDataGap
          });
        }
      }
    } catch (error) {
      logger.error('Error in price anomaly check:', error);
    }
  }

  async checkDataQuality() {
    const client = await pool.connect();
    try {
      const tokens = await client.query(`
        SELECT symbol, chain FROM tokens WHERE is_active = true
      `);

      for (const token of tokens.rows) {
        const validation = await priceQueries.validatePriceData(
          token.symbol, 
          token.chain
        );

        if (validation.status !== 'OK') {
          await this.sendAlert('warn', `Data quality issue detected for ${token.symbol}`, {
            ...validation,
            symbol: token.symbol,
            chain: token.chain
          });
        }
      }
    } finally {
      client.release();
    }
  }

  async checkStorageUsage() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pg_size_pretty(pg_total_relation_size('token_prices')) as total_size,
          pg_size_pretty(pg_relation_size('token_prices')) as table_size,
          pg_size_pretty(pg_indexes_size('token_prices')) as index_size,
          (SELECT COUNT(*) FROM token_prices) as row_count
      `);

      const stats = result.rows[0];
      logger.info('Storage statistics:', stats);

      // Alert if approaching storage limits
      const rowCount = parseInt(stats.row_count);
      if (rowCount > 10000000) { // Example threshold
        await this.sendAlert('warn', 'High storage usage detected', stats);
      }
    } finally {
      client.release();
    }
  }

  start() {
    // Check price anomalies every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      const client = await pool.connect();
      try {
        const tokens = await client.query(`
          SELECT symbol, chain FROM tokens WHERE is_active = true
        `);
        
        for (const token of tokens.rows) {
          await this.checkPriceAnomaly(token.symbol, token.chain);
        }
      } finally {
        client.release();
      }
    });

    // Check data quality hourly
    cron.schedule('0 * * * *', () => this.checkDataQuality());

    // Check storage usage daily
    cron.schedule('0 0 * * *', () => this.checkStorageUsage());
  }
}

module.exports = new PriceMonitor();