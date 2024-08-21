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
}

module.exports = new SolanaService();
