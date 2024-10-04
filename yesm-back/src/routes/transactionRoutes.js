const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();  // Load .env file

// Use Zerion as the primary API for fetching wallet transactions
router.get('/wallet/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions?filter[operation_types]=trade,send,receive,deposit,withdraw`;
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

    // Define and filter relevant transactions here
    const transactions = response.data.data;
    const relevantTransactions = transactions.filter((tx) => {
      const attributes = tx.attributes || {};
      const operationType = attributes.operation_type || '';

      console.log(`Transaction operation type: ${operationType}`);

      // Check for relevant transaction types
      return ['trade', 'send', 'receive', 'deposit', 'withdraw'].includes(operationType.toLowerCase());
    });

    if (relevantTransactions.length > 0) {
      res.json(relevantTransactions); // Send relevant transactions to the frontend
    } else {
      res.status(404).json({ error: `No relevant transactions found. Fetched ${transactions.length} total transactions.` });
    }
  } catch (error) {
    console.error('Error fetching wallet transactions from Zerion:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while fetching transactions.' });
  }
});

module.exports = router;
