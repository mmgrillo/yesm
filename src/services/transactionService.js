// src/services/transactionService.js
const zerionService = require('./zerionService');
const initWeb3 = require('./web3Provider');
const logger = require('../utils/logger');

class TransactionService {
  constructor() {
    this.web3 = initWeb3();
  }

  async fetchTransactionDetails(txHash, chain) {
    try {
      // Replace Covalent with Zerion API for fetching transaction details
      const transactionDetails = await zerionService.getTransactionDetails(chain, txHash);

      if (!transactionDetails || transactionDetails.length === 0) {
        throw new Error(`Transaction or receipt not found for ${txHash} on ${chain}`);
      }

      return transactionDetails;
    } catch (error) {
      logger.error(`Error fetching transaction details from Zerion: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TransactionService();
