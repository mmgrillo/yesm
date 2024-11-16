const { pool } = require('../database/schema');
const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

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

  async populateTokenPrices() {
    const client = await pool.connect();
    
    try {
      logger.info('Starting token price population...');
      
      // Calculate timestamp for retention period
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);

      // First cleanup any data older than retention period
      await client.query(`
        DELETE FROM token_prices
        WHERE timestamp < $1::timestamp
      `, [retentionDate]);

      for (const token of this.tokens) {
        logger.info(`Processing ${token.symbol}...`);

        try {
          // Get or create token record
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

          // If we have recent data, only fetch from there, otherwise fetch from retention date
          const fetchFromDate = lastPriceResult.rows[0].last_timestamp || retentionDate;

          // Fetch price data
          const priceData = await this.fetchPriceDataZerion(token, fetchFromDate);
          
          // Batch insert prices
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

        // Delay between tokens to respect API rate limits
        await this.delay(2000);
      }

      logger.info('Token price population completed');
    } catch (error) {
      logger.error('Error in price population:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchPriceDataZerion(token, fromDate) {
    try {
      const encodedApiKey = Buffer.from(`${this.ZERION_API_KEY}:`).toString('base64');
      
      const response = await axios.get(
        `${this.ZERION_API_URL}/fungibles/${token.address}/charts`, {
          headers: {
            accept: 'application/json',
            Authorization: `Basic ${encodedApiKey}`,
          },
          params: {
            currency: 'usd',
            resolution: '1min',
            from: Math.floor(fromDate.getTime() / 1000),
            to: Math.floor(Date.now() / 1000)
          }
        }
      );

      if (!response.data?.points) {
        throw new Error('Invalid response from Zerion API');
      }

      return response.data.points.map(point => ({
        timestamp: new Date(point.date),
        price: point.value
      }));

    } catch (error) {
      logger.error('Error fetching price data from Zerion:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const service = new TokenPricePopulationService();
  service.populateTokenPrices()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Population script failed:', error);
      process.exit(1);
    });
}

module.exports = TokenPricePopulationService;