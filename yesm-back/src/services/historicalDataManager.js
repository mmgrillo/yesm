// src/services/historicalDataManager.js
const { pool } = require('../database/schema');
const logger = require('../utils/logger');

class HistoricalDataManager {
  static async getTokenPrice(chainId, address, timestamp) {
    const client = await pool.connect();
    try {
      // First try to get the exact minute
      let result = await client.query(`
        SELECT tp.price
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE t.chain = $1 
        AND t.address = $2
        AND tp.timestamp = $3
      `, [chainId, address, timestamp]);

      if (result.rows.length > 0) {
        return result.rows[0].price;
      }

      // If not found, get the closest price within 5 minutes
      result = await client.query(`
        SELECT tp.price
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE t.chain = $1 
        AND t.address = $2
        AND tp.timestamp BETWEEN $3 - 300 AND $3 + 300
        ORDER BY ABS(tp.timestamp - $3)
        LIMIT 1
      `, [chainId, address, timestamp]);

      if (result.rows.length > 0) {
        return result.rows[0].price;
      }

      // If still not found, fall back to hourly data
      const hourTimestamp = new Date(timestamp * 1000).setMinutes(0, 0, 0) / 1000;
      result = await client.query(`
        SELECT close_price as price
        FROM token_prices_hourly tph
        JOIN tokens t ON t.id = tph.token_id
        WHERE t.chain = $1 
        AND t.address = $2
        AND EXTRACT(EPOCH FROM tph.hour) = $3
      `, [chainId, address, hourTimestamp]);

      return result.rows.length > 0 ? result.rows[0].price : null;
    } finally {
      client.release();
    }
  }

  static async storePrices(prices) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const price of prices) {
        // Get or create token
        const tokenResult = await client.query(`
          INSERT INTO tokens (symbol, chain, address)
          VALUES ($1, $2, $3)
          ON CONFLICT (chain, address) 
          DO UPDATE SET symbol = EXCLUDED.symbol
          RETURNING id
        `, [price.symbol, price.chain, price.address]);

        const tokenId = tokenResult.rows[0].id;

        // Store price
        await client.query(`
          INSERT INTO token_prices (token_id, timestamp, price, volume_24h)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (token_id, timestamp) 
          DO UPDATE SET 
            price = EXCLUDED.price,
            volume_24h = EXCLUDED.volume_24h
        `, [tokenId, price.timestamp, price.price, price.volume_24h]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Add methods for fear/greed and M2 data...
}

module.exports = HistoricalDataManager;