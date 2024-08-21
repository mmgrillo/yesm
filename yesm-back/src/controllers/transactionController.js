const chainDetectionService = require('../services/chainDetectionService');

exports.getTransactionDetails = async (req, res) => {
  try {
    const { txHash } = req.params;
    const chain = await chainDetectionService.detectChain(txHash);

    if (!chain) {
      return res.status(404).json({ error: 'Transaction not found on any known chain.' });
    }

    const transactionDetails = await chainDetectionService.fetchTransactionDetails(txHash, chain);

    if (!transactionDetails) {
      return res.status(404).json({ error: 'Transaction details could not be retrieved.' });
    }

    console.log('Transaction Details:', transactionDetails); // Log the transaction details

    res.json(transactionDetails);
  } catch (error) {
    console.error('Error in getTransactionDetails:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};
