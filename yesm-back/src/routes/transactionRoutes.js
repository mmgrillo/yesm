const express = require('express');
const router = express.Router();
const axios = require('axios'); // Required for fetching transactions
const ApiService = require('../services/apiService'); // Ensure this path is correct
require('dotenv').config();  // Load .env file

// Use Zerion as the primary API for fetching wallet transactions
router.get('/wallet/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions?filter[operation_types]=trade`;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const response = await axios.get(ZERION_API_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    console.log('Fetched transactions from Zerion:', response.data);

    const transactions = response.data.data;
    const relevantTransactions = transactions.filter((tx) => {
      const attributes = tx.attributes || {};
      const operationType = attributes.operation_type || '';
      return ['trade'].includes(operationType.toLowerCase());
    });

    if (relevantTransactions.length > 0) {
      res.json(relevantTransactions);
    } else {
      res.status(404).json({ error: `No relevant transactions found. Fetched ${transactions.length} total transactions.` });
    }
  } catch (error) {
    console.error('Error fetching wallet transactions from Zerion:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while fetching transactions.' });
  }
});

// Updated route for fetching token prices using chain-agnostic fungible IDs
router.get('/token-prices', async (req, res) => {
  try {
    const { addresses, chains } = req.query;
    if (!addresses || !chains) {
      return res.status(400).json({ error: 'Token addresses and chain information are required.' });
    }

    // Split addresses and chains into arrays to align them correctly
    const addressList = addresses.split(',');
    const chainList = chains.split(',');

    // Construct an array of tokens with both chain and address information
    const tokens = addressList.map((address, index) => {
      const chain = chainList[index] || 'eth'; // Use the specific chain or default to Ethereum if not specified
      return { chain: chain.toLowerCase(), address };
    }).filter(token => token.chain && token.address); // Filter out any tokens that are missing data

    console.log('Fetching prices for tokens with specific chains:', tokens);

    // Call fetchTokenPrices function and handle its response
    const prices = await ApiService.fetchTokenPrices(tokens);

    if (!prices || Object.keys(prices).length === 0) {
      console.warn('No valid prices returned from API');
      return res.status(404).json({ error: 'No valid prices found for the provided tokens.' });
    }

    res.json(prices);
  } catch (error) {
    console.error('Error in /token-prices route:', error);
    res.status(500).json({ error: 'Failed to fetch token prices', details: error.message });
  }
});

// Other routes remain unchanged

// Route for fetching detailed transaction information
router.get('/transaction-details/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  try {
    const transactionDetails = await ApiService.getTransactionDetails(transactionId);
    if (!transactionDetails) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    res.json(transactionDetails);
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({ error: 'Failed to fetch transaction details', details: error.message });
  }
});

// Route for fetching all tokens in the user's portfolio
router.get('/portfolio/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  try {
    const portfolioData = await ApiService.getPortfolio(walletAddress);
    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data', details: error.message });
  }
});

module.exports = router;
