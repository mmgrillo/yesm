const axios = require('axios');
const logger = require('../utils/logger');

class SolanaService {
  async checkSolana(txHash) {
    try {
      const response = await axios.post('https://api.mainnet-beta.solana.com', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txHash, 'json'],
      });

      if (response.data.result !== null) {
        logger.debug(`Transaction found on Solana`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error checking Solana: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return false;
    }
  }

  async fetchTransactionDetails(txHash) {
    try {
      const response = await axios.post('https://api.mainnet-beta.solana.com', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txHash, 'json'],
      });

      const transaction = response.data.result;

      if (transaction) {
        return {
          blockchain: 'solana',
          status: transaction.meta.err ? 'Failed' : 'Success',
          amount: transaction.meta.postBalances[1] - transaction.meta.preBalances[1], // Example logic
          fee: transaction.meta.fee,
          from: transaction.transaction.message.accountKeys[0].pubkey,
          to: transaction.transaction.message.accountKeys[1].pubkey,
          confirmations: transaction.confirmations,
          blockNumber: transaction.slot,
        };
      } else {
        throw new Error('Transaction not found on Solana');
      }
    } catch (error) {
      logger.error(`Error fetching Solana transaction details: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return null;
    }
  }
}

module.exports = new SolanaService();
