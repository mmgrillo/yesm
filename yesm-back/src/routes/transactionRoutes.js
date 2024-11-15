const express = require('express');
const router = express.Router();
const axios = require('axios');
const ApiService = require('../services/apiService');
const CacheService = require('../services/cacheService');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
require('dotenv').config();

// Rate limiter configuration remains the same
const createLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' }
});

const walletLimiter = createLimiter(60 * 1000, 100);
const priceLimiter = createLimiter(60 * 1000, 200);
const marketDataLimiter = createLimiter(60 * 1000, 50);

router.get('/wallet/:walletAddress', walletLimiter, async (req, res) => {
  const { walletAddress } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions?filter[operation_types]=trade&limit=${limit}&offset=${offset}`;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const response = await axios.get(ZERION_API_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    const transactions = response.data.data;
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: 'No relevant transactions found.' });
    }

    res.json(transactions);
  } catch (error) {
    logger.error('Error fetching wallet transactions:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    return res.status(500).json({ error: 'Failed to fetch wallet transactions.' });
  }
});

// Portfolio endpoint
router.get('/wallet/:walletAddress/portfolio', walletLimiter, async (req, res) => {
  const { walletAddress } = req.params;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const ZERION_PORTFOLIO_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/portfolio?currency=usd`;

    const portfolioResponse = await axios.get(ZERION_PORTFOLIO_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    const portfolioData = portfolioResponse.data.data;
    const balance = portfolioData.attributes.total?.positions || 0;
    const chainBalances = portfolioData.attributes.positions_distribution_by_chain || {};
    const tokens = Object.entries(chainBalances).map(([chain, amount]) => ({
      chain,
      amount,
    }));

    res.json({ balance, tokens });
  } catch (error) {
    logger.error('Error fetching wallet portfolio:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet portfolio.' });
  }
});

router.post('/token-prices', priceLimiter, async (req, res) => {
  const tokens = req.body.tokens;
  const client = await pool.connect();
  const RETENTION_DAYS = 30; // Keep 30 days of historical prices
  
  try {
    const prices = {};
    
    // First cleanup old prices
    await client.query(`
      DELETE FROM token_prices 
      WHERE timestamp < extract(epoch from (now() - interval '${RETENTION_DAYS} days'))
    `);
    
    for (const token of tokens) {
      const key = token.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' : `${token.chain}:${token.address}`;
      
      // Try cache first
      const cachedPrice = CacheService.get(key);
      if (cachedPrice) {
        prices[key] = cachedPrice;
        continue;
      }

      // Try database for recent price (last 24 hours)
      const dbResult = await client.query(`
        SELECT tp.price, t.symbol
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE t.chain = $1 
        AND t.address = $2
        AND tp.timestamp > extract(epoch from (now() - interval '24 hours'))
        ORDER BY tp.timestamp DESC
        LIMIT 1
      `, [token.chain || 'ethereum', token.address]);

      if (dbResult.rows[0]) {
        prices[key] = {
          usd: dbResult.rows[0].price,
          symbol: dbResult.rows[0].symbol
        };
        CacheService.set(key, prices[key]);
        continue;
      }

      // Fallback to Zerion API
      try {
        const apiUrl = `${ZERION_API_URL}/fungibles/${token.address}?fields=market_data.price`;
        const response = await axios.get(apiUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
            accept: 'application/json',
          },
        });

        const price = response.data.data.attributes.market_data?.price;
        prices[key] = {
          usd: price !== undefined ? price : null,
          symbol: token.symbol,
        };

        // Store only current price
        if (price !== undefined) {
          await client.query(`
            WITH token_insert AS (
              INSERT INTO tokens (symbol, chain, address)
              VALUES ($1, $2, $3)
              ON CONFLICT (chain, address) DO UPDATE 
              SET symbol = EXCLUDED.symbol
              RETURNING id
            )
            INSERT INTO token_prices (token_id, price, timestamp)
            SELECT id, $4, extract(epoch from now())
            FROM token_insert
          `, [token.symbol, token.chain || 'ethereum', token.address, price]);
        }

        CacheService.set(key, prices[key]);
      } catch (error) {
        logger.error('Error fetching from Zerion:', error);
        prices[key] = { usd: null, symbol: token.symbol };
      }
    }

    res.json(prices);
  } catch (error) {
    logger.error('Error fetching token prices:', error);
    res.status(500).json({ error: 'Failed to fetch token prices' });
  } finally {
    client.release();
  }
});

// Market data endpoints using database
router.get('/fear-greed-index/:timestamp', marketDataLimiter, async (req, res) => {
  const timestamp = parseInt(req.params.timestamp);
  const client = await pool.connect();
  
  try {
    // Check cache first
    const cacheKey = CacheService.generateKey('fear-greed', timestamp);
    const cachedData = CacheService.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    // Round timestamp to start of day for database query
    const startOfDay = Math.floor(timestamp / 86400) * 86400;
    const endOfDay = startOfDay + 86399;

    // Try database first with day range
    const result = await client.query(`
      SELECT * FROM fear_greed_index
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY ABS(timestamp - $3)
      LIMIT 1
    `, [startOfDay, endOfDay, timestamp]);

    if (result.rows.length > 0) {
      const data = result.rows[0];
      CacheService.set(cacheKey, data);
      return res.json(data);
    }

    // Fallback to API
    const fgiData = await ApiService.fetchFearGreedIndex(timestamp);
    if (fgiData) {
      // Store in database at start of day
      const dayTimestamp = startOfDay;
      await client.query(`
        INSERT INTO fear_greed_index (timestamp, value, classification)
        VALUES ($1, $2, $3)
        ON CONFLICT (timestamp) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          classification = EXCLUDED.classification
      `, [dayTimestamp, fgiData.value, fgiData.classification]);
      
      CacheService.set(cacheKey, fgiData);
      res.json(fgiData);
    } else {
      res.status(404).json({ error: 'Fear & Greed data not found' });
    }
  } catch (error) {
    logger.error('Error fetching Fear & Greed Index:', {
      error: error.message,
      timestamp,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Fear & Greed Index' });
  } finally {
    client.release();
  }
});

router.get('/macro-indicators/:timestamp', marketDataLimiter, async (req, res) => {
  const timestamp = parseInt(req.params.timestamp);
  const client = await pool.connect();

  try {
    // Check cache first
    const cacheKey = CacheService.generateKey('macro', timestamp);
    const cachedData = CacheService.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    // Convert timestamp to date for database query
    const result = await client.query(`
      WITH date_value AS (
        SELECT TO_TIMESTAMP($1) AT TIME ZONE 'UTC' AS query_date
      )
      SELECT m2.*, 
             date_value.query_date
      FROM m2_supply m2
      CROSS JOIN date_value
      WHERE m2.date <= (date_value.query_date)::date
      ORDER BY m2.date DESC
      LIMIT 12
    `, [timestamp]);

    if (result.rows.length > 0) {
      const currentValue = result.rows[0].value;
      const threeMonthValue = result.rows[3]?.value;
      const yearAgoValue = result.rows[11]?.value;

      const macroData = {
        currentValue,
        threeMonthChange: threeMonthValue ? ((currentValue - threeMonthValue) / threeMonthValue) * 100 : null,
        yearChange: yearAgoValue ? ((currentValue - yearAgoValue) / yearAgoValue) * 100 : null,
        observations: result.rows.map(row => ({
          date: row.date,
          value: row.value
        })),
        timestamp: timestamp,
        requestedDate: result.rows[0].query_date
      };

      CacheService.set(cacheKey, macroData);
      return res.json(macroData);
    }

    // Fallback to API
    const macroData = await ApiService.fetchMacroIndicators(timestamp);
    if (macroData) {
      // Store in database with proper date conversion
      try {
        await client.query(`
          INSERT INTO m2_supply (date, value)
          VALUES (TO_TIMESTAMP($1) AT TIME ZONE 'UTC'::date, $2)
          ON CONFLICT (date) 
          DO UPDATE SET value = EXCLUDED.value
        `, [timestamp, macroData.currentValue]);
        
        // Also store historical observations if available
        if (macroData.observations?.length > 0) {
          for (const obs of macroData.observations) {
            await client.query(`
              INSERT INTO m2_supply (date, value)
              VALUES ($1::date, $2)
              ON CONFLICT (date) DO NOTHING
            `, [obs.date, obs.value]);
          }
        }
      } catch (dbError) {
        logger.error('Error storing macro data:', {
          error: dbError.message,
          timestamp,
          stack: dbError.stack
        });
      }

      CacheService.set(cacheKey, macroData);
      res.json(macroData);
    } else {
      res.status(404).json({ error: 'Macro data not found' });
    }
  } catch (error) {
    logger.error('Error fetching macro indicators:', {
      error: error.message,
      timestamp,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch macro indicators' });
  } finally {
    client.release();
  }
});

module.exports = router;