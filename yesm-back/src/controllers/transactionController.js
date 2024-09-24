const chainDetectionService = require('../services/chainDetectionService');
const axios = require('axios');

exports.getWalletTransactions = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions`;
    const ZERION_API_KEY = process.env.ZERION_API_KEY;

    // Fetch wallet transactions from Zerion API using Basic Authentication
    try {
      const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
      const response = await axios.get(ZERION_API_URL, {
        headers: {
          accept: 'application/json',
          Authorization: `Basic ${encodedApiKey}`,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error('Zerion API failed:', error.message);

      // Handle specific 401 Unauthorized error
      if (error.response && error.response.status === 401) {
        return res.status(401).json({ error: 'Unauthorized. Please check your API key.' });
      }

      // Fallback to backup
      const backupTransactions = await chainDetectionService.fetchWalletTransactions(walletAddress);
      res.json(backupTransactions);
    }
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500).json({ error: 'Failed to fetch wallet transactions' });
  }
};
