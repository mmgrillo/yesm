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
router.get('/wallet/:walletAddress', walletLimiter, async (req, res) => {
  const { walletAddress } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const client = await pool.connect();
  try {
    // Query transactions from database
    const result = await client.query(`
      SELECT t.*, tp.price as token_price
      FROM transactions t
      LEFT JOIN token_prices tp ON t.token_id = tp.token_id
      WHERE t.wallet_address = $1
      ORDER BY t.timestamp DESC
      LIMIT $2 OFFSET $3
    `, [walletAddress, limit, offset]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No transactions found.' });
    }

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching wallet transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  } finally {
    client.release();
  }
});

// Get token prices from database
router.post('/token-prices', priceLimiter, async (req, res) => {
  const { tokens } = req.body;
  const client = await pool.connect();
  
  try {
    const prices = {};
    
    for (const token of tokens) {
      const key = token.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' : `${token.chain}:${token.address}`;
      
      // Try cache first
      const cachedPrice = CacheService.get(key);
      if (cachedPrice) {
        prices[key] = cachedPrice;
        continue;
      }

      // Query from database
      const result = await client.query(`
        SELECT tp.price, t.symbol
        FROM token_prices tp
        JOIN tokens t ON t.id = tp.token_id
        WHERE t.address = $1 AND t.chain = $2
        ORDER BY tp.timestamp DESC
        LIMIT 1
      `, [token.address, token.chain]);

      if (result.rows.length > 0) {
        prices[key] = {
          usd: result.rows[0].price,
          symbol: result.rows[0].symbol
        };
        CacheService.set(key, prices[key]);
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