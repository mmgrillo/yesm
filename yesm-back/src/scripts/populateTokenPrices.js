// src/scripts/populateTokenPrices.js
const { pool } = require('../database/schema');
const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

async function checkDatabaseConnection() {
  const client = await pool.connect();
  try {
    logger.info('Testing database connection...');
    logger.info('Database URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
    
    const result = await client.query('SELECT NOW()');
    logger.info('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', {
      error: error.message,
      code: error.code,
      details: error.details,
      env: process.env.NODE_ENV,
      dbUrl: process.env.DATABASE_URL?.substring(0, 20) + '...' // Log just the start for security
    });
    throw error;
  } finally {
    client.release();
  }
}

class TokenPricePopulationService {
  constructor() {
    this.ZERION_API_URL = 'https://api.zerion.io/v1';
    this.ZERION_API_KEY = process.env.ZERION_API_KEY;
    this.RETENTION_YEARS = 2;
    this.tokens = [
      { symbol: 'ETH', chain: 'ethereum', address: 'eth' },
      { symbol: 'BTC', chain: 'bitcoin', address: 'btc' },
      { symbol: 'SOL', chain: 'solana', address: 'sol' },
    ];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPriceDataZerion(token, fromTimestamp) {
    try {
      const encodedApiKey = Buffer.from(`${this.ZERION_API_KEY}:`).toString('base64');
      
      // Due to API limitations, fetch data in chunks of 3 months
      const CHUNK_SIZE = 90 * 24 * 60 * 60; // 90 days in seconds
      const endTimestamp = Math.floor(Date.now() / 1000);
      let currentTimestamp = fromTimestamp;
      let allPriceData = [];

      while (currentTimestamp < endTimestamp) {
        const chunkEndTimestamp = Math.min(currentTimestamp + CHUNK_SIZE, endTimestamp);
        
        logger.info(`Fetching price data for ${token.symbol} from ${new Date(currentTimestamp * 1000).toISOString()} to ${new Date(chunkEndTimestamp * 1000).toISOString()}`);

        const response = await axios.get(
          `${this.ZERION_API_URL}/fungibles/${token.address}/charts`, {
            headers: {
              accept: 'application/json',
              Authorization: `Basic ${encodedApiKey}`,
            },
            params: {
              currency: 'usd',
              resolution: '1min',
              from: currentTimestamp,
              to: chunkEndTimestamp
            }
          }
        );

        if (response.data?.points) {
          const chunkData = response.data.points.map(point => ({
            timestamp: new Date(point.date),
            price: point.value
          }));
          allPriceData = allPriceData.concat(chunkData);
        }

        // Move to next chunk
        currentTimestamp = chunkEndTimestamp;
        // Respect API rate limits
        await this.delay(1000);
      }

      return allPriceData;
    } catch (error) {
      logger.error('Error fetching price data from Zerion:', error);
      throw error;
    }
  }

  async populateTokenPrices() {
    const client = await pool.connect();
    
    try {
      logger.info('Starting token price population...');
      
      // Calculate timestamp for 2 years ago
      const twoYearsAgo = Math.floor((Date.now() - (this.RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000)) / 1000);

      // First cleanup any data older than 2 years
      await client.query(`
        DELETE FROM token_prices
        WHERE timestamp < NOW() - INTERVAL '${this.RETENTION_YEARS} years'
      `);

      for (const token of this.tokens) {
        logger.info(`Processing ${token.symbol}...`);

        try {
          // Get token ID
          const tokenResult = await client.query(`
            INSERT INTO tokens (symbol, chain, address)
            VALUES ($1, $2, $3)
            ON CONFLICT (chain, address) 
            DO UPDATE SET symbol = EXCLUDED.symbol
            RETURNING id
          `, [token.symbol, token.chain, token.address]);

          const tokenId = tokenResult.rows[0].id;

          // Find the most recent price timestamp for this token
          const lastPriceResult = await client.query(`
            SELECT MAX(timestamp) as last_timestamp
            FROM token_prices
            WHERE token_id = $1
          `, [tokenId]);

          // If we have recent data, only fetch from there, otherwise fetch full 2 years
          const fetchFromTimestamp = lastPriceResult.rows[0].last_timestamp 
            ? Math.floor(lastPriceResult.rows[0].last_timestamp.getTime() / 1000)
            : twoYearsAgo;

          // Fetch price data
          const priceData = await this.fetchPriceDataZerion(token, fetchFromTimestamp);
          
          // Batch insert prices in chunks to avoid memory issues
          const BATCH_SIZE = 5000;
          for (let i = 0; i < priceData.length; i += BATCH_SIZE) {
            const batch = priceData.slice(i, i + BATCH_SIZE);
            
            await client.query('BEGIN');
            
            for (const data of batch) {
              await client.query(`
                INSERT INTO token_prices (token_id, timestamp, price)
                VALUES ($1, $2, $3)
                ON CONFLICT (token_id, timestamp) 
                DO UPDATE SET price = EXCLUDED.price
              `, [tokenId, data.timestamp, data.price]);
            }

            await client.query('COMMIT');
            
            logger.info(`Processed ${i + batch.length}/${priceData.length} prices for ${token.symbol}`);
          }

          logger.info(`Successfully populated prices for ${token.symbol}`);

        } catch (error) {
          await client.query('ROLLBACK');
          logger.error(`Error processing ${token.symbol}:`, error);
          continue;
        }
      }

      logger.info('Token price population completed');
    } catch (error) {
      logger.error('Error in price population:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Method to keep prices up to date
  async updateRecentPrices() {
    // Similar to populateTokenPrices but only fetches last 24 hours
    // This can be run more frequently
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabaseConnection()
    .then(() => {
      const service = new TokenPricePopulationService();
      return service.populateTokenPrices();
    })
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Population script failed:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      process.exit(1);
    });
}

module.exports = TokenPricePopulationService;