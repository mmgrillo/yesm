const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../database/schema');
const ApiService = require('../services/apiService');
const rateLimit = require('express-rate-limit'); // Remove duplicate import
const logger = require('../utils/logger');
require('dotenv').config();

// Helper function to validate timestamp
const isValidTimestamp = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(parseInt(timestamp) * 1000);
  return date instanceof Date && !isNaN(date) && 
         date > new Date('2020-01-01') && 
         date < new Date('2025-01-01');
};

router.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({ error: err.message });
});

router.get('/wallet/:walletAddress', async (req, res) => {
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

router.get('/wallet/:walletAddress/portfolio', async (req, res) => {
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

router.post('/token-prices', async (req, res) => {
  const { tokens } = req.body;
  if (!tokens?.length) {
    return res.status(400).json({ error: 'Tokens array is required.' });
  }

  try {
    const prices = await ApiService.fetchTokenPrices(tokens);
    res.json(prices);
  } catch (error) {
    logger.error('Error fetching token prices:', error);
    res.status(500).json({ error: 'Failed to fetch token prices.' });
  }
});



router.get('/fear-greed-index/:timestamp', async (req, res) => {
  const timestamp = parseInt(req.params.timestamp);
  const client = await pool.connect();
  
  if (!isValidTimestamp(timestamp)) {
    return res.status(400).json({ 
      error: 'Invalid timestamp provided',
      validRange: '2020-2024'
    });
  }
  
  try {
    // Convert timestamp to date for database query
    const date = new Date(timestamp * 1000);
    
    // Try database first
    const result = await client.query(`
      SELECT *
      FROM fear_greed_index
      WHERE DATE(to_timestamp(timestamp)) <= DATE($1)
      ORDER BY timestamp DESC
      LIMIT 1
    `, [date.toISOString()]);

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Fallback to API if not in database
    const fgiData = await ApiService.fetchFearGreedIndex(timestamp);
    if (!fgiData) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    // Store in database for future use
    await client.query(`
      INSERT INTO fear_greed_index (timestamp, value, classification)
      VALUES ($1, $2, $3)
      ON CONFLICT (timestamp) DO NOTHING
    `, [fgiData.timestamp, fgiData.value, fgiData.classification]);

    res.json(fgiData);
  } catch (error) {
    logger.error('Error fetching Fear & Greed Index:', error);
    res.status(500).json({ error: 'Failed to fetch Fear & Greed Index' });
  } finally {
    client.release();
  }
});

router.get('/macro-indicators/:timestamp', async (req, res) => {
  const timestamp = parseInt(req.params.timestamp);
  const client = await pool.connect();

  if (!isValidTimestamp(timestamp)) {
    return res.status(400).json({ 
      error: 'Invalid timestamp provided',
      validRange: '2020-2024'
    });
  }

  try {
    const date = new Date(timestamp * 1000);
    
    // Try database with date-based query
    const result = await client.query(`
      WITH date_value AS (
        SELECT $1::date as query_date
      )
      SELECT m2.*,
             date_value.query_date
      FROM m2_supply m2
      CROSS JOIN date_value
      WHERE m2.date <= date_value.query_date
      ORDER BY m2.date DESC
      LIMIT 12
    `, [date.toISOString()]);

    if (result.rows.length > 0) {
      const currentValue = result.rows[0].value;
      const threeMonthValue = result.rows[3]?.value;
      const yearAgoValue = result.rows[11]?.value;

      const macroData = {
        currentValue,
        threeMonthChange: threeMonthValue ? ((currentValue - threeMonthValue) / threeMonthValue) * 100 : null,
        yearChange: yearAgoValue ? ((currentValue - yearAgoValue) / yearAgoValue) * 100 : null,
        observations: result.rows,
        timestamp: timestamp,
        requestedDate: result.rows[0].query_date
      };

      return res.json(macroData);
    }

    // Fallback to API
    const macroData = await ApiService.fetchMacroIndicators(timestamp);
    if (!macroData) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    // Store in database
    await client.query(`
      INSERT INTO m2_supply (date, value)
      VALUES ($1::date, $2)
      ON CONFLICT (date) DO UPDATE SET value = EXCLUDED.value
    `, [date.toISOString(), macroData.currentValue]);

    res.json(macroData);
  } catch (error) {
    logger.error('Error fetching macro indicators:', error);
    res.status(500).json({ error: 'Failed to fetch macro indicators' });
  } finally {
    client.release();
  }
});

router.get('/volatility-indices/:timestamp', async (req, res) => {
  const timestamp = parseInt(req.params.timestamp);
  
  if (!isValidTimestamp(timestamp)) {
    return res.status(400).json({ 
      error: 'Invalid timestamp provided',
      validRange: '2020-2024'
    });
  }

  try {
    const data = await ApiService.fetchVolatilityIndices(timestamp);
    if (!data) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }
    res.json(data);
  } catch (error) {
    logger.error('Error fetching volatility indices:', {
      timestamp,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch volatility indices' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    console.error('Production error:', err);
    
    // Only send error details in development
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Internal server error',
      path: req.path
    });
  });
}

// Add Heroku logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

module.exports = router;