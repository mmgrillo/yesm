// src/scripts/populateHistoricalData.js
const axios = require('axios');
const { pool } = require('../database/schema');
const logger = require('../utils/logger');
require('dotenv').config();

class DataPopulationService {
  constructor() {
    this.FEAR_GREED_API = 'https://api.alternative.me/fng/';
    this.FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
    this.FRED_API_KEY = process.env.FRED_API_KEY;
    this.COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
    this.ZERION_API_URL = 'https://api.zerion.io/v1';
    this.ZERION_API_KEY = process.env.ZERION_API_KEY;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async populateFearGreedIndex() {
    const client = await pool.connect();
    try {
      logger.info('Starting Fear & Greed Index population...');
      
      // Get the last stored timestamp
      const lastEntry = await client.query(`
        SELECT MAX(timestamp) as last_timestamp 
        FROM fear_greed_index
      `);
      
      const startDate = lastEntry.rows[0].last_timestamp 
        ? new Date(lastEntry.rows[0].last_timestamp * 1000)
        : new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)); // 1 year ago

      // Fetch in chunks of 30 days to respect API limits
      const currentDate = new Date();
      let chunkStart = new Date(startDate);
      
      while (chunkStart < currentDate) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setDate(chunkEnd.getDate() + 30);
        
        logger.info(`Fetching Fear & Greed data from ${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`);
        
        const response = await axios.get(`${this.FEAR_GREED_API}?limit=30&format=json`);
        
        if (response.data?.data) {
          for (const item of response.data.data) {
            await client.query(`
              INSERT INTO fear_greed_index (timestamp, value, classification)
              VALUES ($1, $2, $3)
              ON CONFLICT (timestamp) DO UPDATE 
              SET value = EXCLUDED.value, classification = EXCLUDED.classification
            `, [item.timestamp, item.value, item.value_classification]);
          }
        }

        // Respect API rate limits
        await this.delay(1000);
        chunkStart = chunkEnd;
      }

      logger.info('Fear & Greed Index population completed');
    } catch (error) {
      logger.error('Error populating Fear & Greed Index:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async populateM2Supply() {
    const client = await pool.connect();
    try {
      logger.info('Starting M2 Supply data population...');
      
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];

      const response = await axios.get(this.FRED_API_URL, {
        params: {
          series_id: 'M2SL',
          api_key: this.FRED_API_KEY,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate,
          frequency: 'm' // monthly
        }
      });

      if (response.data?.observations) {
        for (const obs of response.data.observations) {
          if (obs.value !== '.') {
            await client.query(`
              INSERT INTO m2_supply (date, value)
              VALUES ($1, $2)
              ON CONFLICT (date) DO UPDATE 
              SET value = EXCLUDED.value
            `, [obs.date, parseFloat(obs.value)]);
          }
        }
      }

      logger.info('M2 Supply data population completed');
    } catch (error) {
      logger.error('Error populating M2 Supply:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async populateTokenPrices() {
    const client = await pool.connect();
    try {
      logger.info('Starting token price population...');
      
      const tokens = [
        // Layer 1 Tokens
        { symbol: 'ETH', chain: 'ethereum', address: null },
        { symbol: 'BTC', chain: 'bitcoin', address: null },
        { symbol: 'SOL', chain: 'solana', address: null },
        { symbol: 'ADA', chain: 'cardano', address: null },
        
        // Stablecoins
        { symbol: 'USDT', chain: 'ethereum', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
        { symbol: 'USDC', chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
        
        // Wrapped Tokens
        { symbol: 'WETH', chain: 'ethereum', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
      ];

      // Calculate storage estimates
      const storageEstimate = {
        minuteData: tokens.length * 1440 * 30, // 30 days of minute data
        hourlyData: tokens.length * 24 * 30,   // 30 days of hourly data
        dailyData: tokens.length * 365,        // 1 year of daily data
      };

      logger.info('Storage estimates:', {
        totalRecords: Object.values(storageEstimate).reduce((a, b) => a + b, 0),
        ...storageEstimate
      });

      for (const token of tokens) {
        // Insert token if not exists
        const tokenResult = await client.query(`
          INSERT INTO tokens (symbol, chain, address)
          VALUES ($1, $2, $3)
          ON CONFLICT (chain, address) DO UPDATE 
          SET symbol = EXCLUDED.symbol
          RETURNING id
        `, [token.symbol, token.chain, token.address]);

        const tokenId = tokenResult.rows[0].id;
        logger.info(`Processing ${token.symbol} (${token.chain})...`);

        try {
          // Get last 24 hours minute-by-minute
          const minuteData = await this.fetchTokenPriceDataZerion(token, '1m', 24 * 60);
          for (const price of minuteData) {
            await client.query(`
              INSERT INTO token_prices (token_id, timestamp, price)
              VALUES ($1, $2, $3)
              ON CONFLICT (token_id, timestamp) DO UPDATE 
              SET price = EXCLUDED.price
            `, [tokenId, price.timestamp, price.price]);
          }
          logger.info(`Completed minute data for ${token.symbol}`);

          await this.delay(1000); // Respect API rate limits

          // Get last month hourly
          const hourlyData = await this.fetchTokenPriceDataZerion(token, '1h', 30 * 24);
          for (const price of hourlyData) {
            await client.query(`
              INSERT INTO token_prices_hourly (token_id, hour, open_price, high_price, low_price, close_price, average_price)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (token_id, hour) DO UPDATE 
              SET open_price = EXCLUDED.open_price,
                  high_price = EXCLUDED.high_price,
                  low_price = EXCLUDED.low_price,
                  close_price = EXCLUDED.close_price,
                  average_price = EXCLUDED.average_price
            `, [tokenId, new Date(price.timestamp * 1000), price.open, price.high, price.low, price.close, price.average]);
          }
          logger.info(`Completed hourly data for ${token.symbol}`);
          
          await this.delay(1000);

          // Get last year daily
          const dailyData = await this.fetchTokenPriceDataZerion(token, '1d', 365);
          for (const price of dailyData) {
            await client.query(`
              INSERT INTO token_prices_daily (token_id, date, open_price, high_price, low_price, close_price, average_price)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (token_id, date) DO UPDATE 
              SET open_price = EXCLUDED.open_price,
                  high_price = EXCLUDED.high_price,
                  low_price = EXCLUDED.low_price,
                  close_price = EXCLUDED.close_price,
                  average_price = EXCLUDED.average_price
            `, [tokenId, new Date(price.timestamp * 1000), price.open, price.high, price.low, price.close, price.average]);
          }
          logger.info(`Completed daily data for ${token.symbol}`);

        } catch (error) {
          logger.error(`Error processing ${token.symbol}:`, error);
          continue; // Continue with next token if one fails
        }

        await this.delay(2000); // Longer delay between tokens
      }

      logger.info('Token price population completed');
    } catch (error) {
      logger.error('Error populating token prices:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchTokenPriceDataZerion(token, interval, limit) {
    try {
      const encodedApiKey = Buffer.from(`${this.ZERION_API_KEY}:`).toString('base64');
      
      // Convert interval to Zerion format
      const intervalMap = {
        '1m': '1min',
        '1h': '1hour',
        '1d': '1day'
      };

      let address = token.address;
      if (!address) {
        // Handle native tokens
        switch(token.symbol) {
          case 'ETH':
            address = 'eth';
            break;
          case 'BTC':
            address = 'btc';
            break;
          case 'SOL':
            address = 'sol';
            break;
          case 'ADA':
            address = 'ada';
            break;
          default:
            throw new Error(`No address mapping for ${token.symbol}`);
        }
      }

      const response = await axios.get(
        `${this.ZERION_API_URL}/fungibles/${address}/charts`, {
          headers: {
            accept: 'application/json',
            Authorization: `Basic ${encodedApiKey}`,
          },
          params: {
            currency: 'usd',
            resolution: intervalMap[interval],
            limit: limit
          }
        }
      );

      if (!response.data?.data) {
        throw new Error('Invalid response from Zerion API');
      }

      return response.data.data.map(point => ({
        timestamp: Math.floor(new Date(point.date).getTime() / 1000),
        price: point.value,
        open: point.open || point.value,
        high: point.high || point.value,
        low: point.low || point.value,
        close: point.close || point.value,
        average: point.value
      }));

    } catch (error) {
      logger.error('Error fetching price data from Zerion:', error);
      throw error;
    }
  }

  async populateAll() {
    try {
      await this.populateFearGreedIndex();
      await this.delay(2000);
      await this.populateM2Supply();
      await this.delay(2000);
      await this.populateTokenPrices();
      logger.info('All historical data populated successfully');
    } catch (error) {
      logger.error('Error in data population:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const service = new DataPopulationService();
  service.populateAll();
}

module.exports = DataPopulationService;