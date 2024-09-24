const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();  // Load .env file

// Use Zerion as the primary API for fetching wallet transactions
router.get('/wallet/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions`;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  try {
    // Encode the API key for Basic Authentication
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    
    const response = await axios.get(ZERION_API_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,  // Updated to use Basic Authentication
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching wallet transactions from Zerion:', error);

    // Handle specific 401 Unauthorized error
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ error: 'Unauthorized. Please check your API key.' });
    }

    // Backup: Use Moralis and Covalent if Zerion fails
    try {
      const backupResponse = await backupFetchTransactions(walletAddress);
      res.json(backupResponse);
    } catch (backupError) {
      res.status(500).json({ error: 'Failed to fetch wallet transactions from both Zerion and backup services' });
    }
  }
});

// Backup fetching using Moralis and Covalent
const backupFetchTransactions = async (walletAddress) => {
  const chainDetectionService = require('../services/chainDetectionService');
  return await chainDetectionService.fetchWalletTransactions(walletAddress);
};

module.exports = router;
