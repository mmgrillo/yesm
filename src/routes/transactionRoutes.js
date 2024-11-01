const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();  // Load .env file
const ApiService = require('../services/apiService');

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

    // Simply return the transactions without fetching prices
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet transactions from Zerion:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while fetching transactions.' });
  }
});

// Endpoint to get token prices
router.post('/token-prices', async (req, res) => {
  console.log('Received POST request to /token-prices');
  console.log('Request body:', req.body);
  const tokens = req.body.tokens; // Expect tokens to be an array of { chain, address }

  try {
    const prices = await ApiService.fetchTokenPrices(tokens);
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

module.exports = router;