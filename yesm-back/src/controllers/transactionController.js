const chainDetectionService = require('../services/chainDetectionService');

exports.getTransactionDetails = async (req, res) => {
  try {
    const { txHash } = req.params;
    const chain = await chainDetectionService.detectChain(txHash);
    
    if (!chain) {
      return res.status(404).json({ error: 'Transaction not found on any known chain.' });
    }

    let transactionDetails;

    switch (chain.toLowerCase()) {
      case 'ethereum':
        transactionDetails = await chainDetectionService.fetchEthereumTransactionDetails(txHash);
        break;
      case 'polygon':
        transactionDetails = await chainDetectionService.fetchPolygonTransactionDetails(txHash);
        break;
      case 'arbitrum':
        transactionDetails = await chainDetectionService.fetchArbitrumTransactionDetails(txHash);
        break;
      case 'optimism':
        transactionDetails = await chainDetectionService.fetchOptimismTransactionDetails(txHash);
        break;
      default:
        return res.status(404).json({ error: 'Chain is recognized but no fetch method implemented for this chain.' });
    }

    if (!transactionDetails) {
      return res.status(404).json({ error: 'Transaction details could not be retrieved.' });
    }

    res.json({
      txHash,
      chain,
      transactionDetails, // Return the full transaction details
      message: `This transaction belongs to the ${chain} chain.`,
    });
  } catch (error) {
    console.error('Error in getTransactionDetails:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};
