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
  const { timestamp } = req.params;
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM fear_greed_index
      WHERE timestamp <= $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [timestamp]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No fear & greed data found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching fear & greed index:', error);
    res.status(500).json({ error: 'Failed to fetch fear & greed index' });
  } finally {
    client.release();
  }
});

router.get('/macro-indicators/:timestamp', marketDataLimiter, async (req, res) => {
  const { timestamp } = req.params;
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM m2_supply
      WHERE date <= to_timestamp($1)::date
      ORDER BY date DESC
      LIMIT 12
    `, [timestamp]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No macro data found' });
    }

    const currentValue = result.rows[0].value;
    const threeMonthValue = result.rows[3]?.value;
    const yearAgoValue = result.rows[11]?.value;

    const macroData = {
      currentValue,
      threeMonthChange: threeMonthValue ? ((currentValue - threeMonthValue) / threeMonthValue) * 100 : null,
      yearChange: yearAgoValue ? ((currentValue - yearAgoValue) / yearAgoValue) * 100 : null,
      observations: result.rows
    };

    res.json(macroData);
  } catch (error) {
    logger.error('Error fetching macro indicators:', error);
    res.status(500).json({ error: 'Failed to fetch macro indicators' });
  } finally {
    client.release();
  }
});

module.exports = router;