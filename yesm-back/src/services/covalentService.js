// src/services/covalentService.js
const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

class CovalentService {
  async getTransactionDetails(chainId, txHash) {
    try {
      const response = await axios.get(`https://api.covalenthq.com/v1/${chainId}/transaction_v2/${txHash}/`, {
        params: {
          key: config.covalentApiKey,
        }
      });
      return response.data.data.items;
    } catch (error) {
      logger.error(`Error fetching transaction details from Covalent: ${error.message}`);
      throw error;
    }
  }

  async getERCTransfers(chainId, walletAddress) {
    try {
      const response = await axios.get(`https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transfers_v2/`, {
        params: {
          key: config.covalentApiKey,
        }
      });
      return response.data.data.items;
    } catch (error) {
      logger.error(`Error fetching ERC-xx transfers from Covalent: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CovalentService();
