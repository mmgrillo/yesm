// src/controllers/transactionController.js
const chainDetectionService = require('../services/chainDetectionService');

exports.getTransactionDetails = async (req, res) => {
  try {
    const { txHash } = req.params;

    // Fetch transaction details after detecting the chain
    const transactionDetails = await chainDetectionService.fetchTransactionDetails(txHash);

    if (!transactionDetails) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    res.json(transactionDetails);
  } catch (error) {
    console.error('Error in getTransactionDetails:', error);
    res.status(500).json({ error: 'An error occurred while fetching transaction details.' });
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Fetch wallet transactions after detecting the chain
    const walletTransactions = await chainDetectionService.fetchWalletTransactions(walletAddress);

    if (!walletTransactions) {
      return res.status(404).json({ error: 'No transactions found for this wallet.' });
    }

    res.json(walletTransactions);
  } catch (error) {
    console.error('Error in getWalletTransactions:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};
