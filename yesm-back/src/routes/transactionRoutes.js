const express = require('express');
const router = express.Router();
const { pool } = require('../database/schema');
const CacheService = require('../services/cacheService');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
require('dotenv').config();

// Rate limiter configuration
const createLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const walletLimiter = createLimiter(60 * 1000, 100);
const priceLimiter = createLimiter(60 * 1000, 200);
const marketDataLimiter = createLimiter(60 * 1000, 50);

// Get wallet transactions with pagination
router.get('/wallet/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const client = await pool.connect();
  try {
    // First get token information
    const tokenResult = await client.query(`
      SELECT t.id, t.symbol, t.chain, t.address
      FROM tokens t
      WHERE t.chain = $1
      ORDER BY t.symbol
    `, ['ethereum']); // Default to ethereum chain

    // Get token prices
    const priceResult = await client.query(`
      SELECT tp.token_id, tp.price, tp.timestamp
      FROM token_prices tp
      INNER JOIN tokens t ON t.id = tp.token_id
      ORDER BY tp.timestamp DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const result = {
      tokens: tokenResult.rows,
      prices: priceResult.rows
    };

    res.json(result);
  } catch (error) {
    logger.error('Error fetching wallet data:', error);
    res.status(500).json({ error: 'Failed to fetch wallet data' });
  } finally {
    client.release();
  }
});

router.post('/token-prices', async (req, res) => {
  const { tokens } = req.body;
  const client = await pool.connect();
  
  try {
    const prices = {};
    
    for (const token of tokens) {
      const result = await client.query(`
        SELECT tp.price, t.symbol, t.chain, t.address
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE t.chain = $1 AND t.address = $2
        ORDER BY tp.timestamp DESC
        LIMIT 1
      `, [token.chain || 'ethereum', token.address]);

      if (result.rows[0]) {
        const key = `${result.rows[0].chain}:${result.rows[0].address}`;
        prices[key] = {
          usd: result.rows[0].price,
          symbol: result.rows[0].symbol
        };
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