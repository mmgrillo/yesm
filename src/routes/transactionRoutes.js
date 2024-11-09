const express = require('express');
const router = express.Router();
const axios = require('axios');
const ApiService = require('../services/apiService');
const CacheService = require('../services/cacheService');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY;


// Use Zerion as the primary API for fetching wallet transactions
router.get('/wallet/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions?limit=${limit}&offset=${offset}&filter[operation_types]=trade`;
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

    // Return the transactions as is (no aggregation for now)
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet transactions from Zerion:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while fetching transactions.' });
  }
});

  
function aggregateTransactions(transactions) {
  const transactionMap = {};
  transactions.forEach(transaction => {
    const tradeId = transaction.attributes.trade_id || transaction.transactionHash;
    if (!transactionMap[tradeId]) {
      transactionMap[tradeId] = { ...transaction, transfers: [] };
    }
    transactionMap[tradeId].transfers.push(...transaction.attributes.transfers);
  });
  return Object.values(transactionMap);
  };

// Endpoint to get token prices
router.post('/token-prices', async (req, res) => {
  const tokens = req.body.tokens;
  
  try {
    const prices = {};
    
    for (const token of tokens) {
      const key = token.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' : `${token.chain}:${token.address}`;
      
      // Try to get from cache first
      const cachedPrice = CacheService.get(key);
      if (cachedPrice) {
        prices[key] = cachedPrice;
        continue;
      }

      // If not in cache, fetch from Zerion
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

      // Cache the result
      CacheService.set(key, prices[key]);
    }

    res.json(prices);
  } catch (error) {
    console.error('Error fetching token prices:', error);
    res.status(500).json({ error: 'Failed to fetch token prices' });
  }
});

// Route fetch wallet portfolio
router.get('/wallet/:walletAddress/portfolio', async (req, res) => {
  const { walletAddress } = req.params;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const ZERION_PORTFOLIO_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/portfolio?currency=usd`;

    // Make the request to Zerion API to get portfolio
    const portfolioResponse = await axios.get(ZERION_PORTFOLIO_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    // Extract the relevant data from the response
    const portfolioData = portfolioResponse.data.data;
    const balance = portfolioData.attributes.total?.positions || 0; // Get total balance

    // Construct tokens array from positions_distribution_by_chain
    const chainBalances = portfolioData.attributes.positions_distribution_by_chain || {};
    const tokens = Object.entries(chainBalances).map(([chain, amount]) => ({
      chain,
      amount,
    }));

    // Respond with the adjusted portfolio data
    res.json({ balance, tokens });
  } catch (error) {
    console.error('Error fetching wallet portfolio from Zerion:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while fetching wallet portfolio.' });
  }
});


const createLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => {
    // Use both IP and endpoint for more granular control
    return `${req.ip}_${req.path}`;
  }
});

// Different limits for different endpoints
const marketDataLimiter = createLimiter(60 * 1000, 30); // 30 requests per minute

// Add rate limiting to market data endpoints
router.get('/fear-greed-index/:timestamp', marketDataLimiter, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const cacheKey = CacheService.generateKey('fear-greed', timestamp);
    const cachedData = CacheService.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const fgiData = await ApiService.fetchFearGreedIndex(timestamp);
    CacheService.set(cacheKey, fgiData);
    res.json(fgiData);
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch Fear & Greed Index' });
  }
});

router.get('/macro-indicators/:timestamp', marketDataLimiter, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const cacheKey = CacheService.generateKey('macro', timestamp);
    const cachedData = CacheService.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const macroData = await ApiService.fetchMacroIndicators(timestamp);
    CacheService.set(cacheKey, macroData);
    res.json(macroData);
  } catch (error) {
    console.error('Error fetching macro indicators:', error);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch macro indicators' });
  }
});

router.get('/volatility-indices/:timestamp', marketDataLimiter, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const cacheKey = CacheService.generateKey('volatility', timestamp);
    const cachedData = CacheService.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const volatilityData = await ApiService.fetchVolatilityIndices(timestamp);
    CacheService.set(cacheKey, volatilityData);
    res.json(volatilityData);
  } catch (error) {
    console.error('Error fetching volatility indices:', error);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch volatility indices' });
  }
});

module.exports = router;
