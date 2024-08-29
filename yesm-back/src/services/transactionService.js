// src/services/transactionService.js
const axios = require('axios');
const initWeb3 = require('./web3Provider');
const { getApiUrlAndKey } = require('./apiService');
const logger = require('../utils/logger');

class TransactionService {
  constructor() {
    this.web3 = initWeb3();
  }

  async fetchTransactionAndReceipt(txHash, chain) {
    const { apiUrl, apiKey } = getApiUrlAndKey(chain);

    try {
      const [transactionResponse, receiptResponse] = await Promise.all([
        axios.get(apiUrl, { params: { module: 'proxy', action: 'eth_getTransactionByHash', txhash: txHash, apikey: apiKey } }),
        axios.get(apiUrl, { params: { module: 'proxy', action: 'eth_getTransactionReceipt', txhash: txHash, apikey: apiKey } }),
      ]);

      const transaction = transactionResponse.data.result;
      const receipt = receiptResponse.data.result;

      if (!transaction || !receipt) {
        throw new Error(`Transaction or receipt not found on ${chain}`);
      }

      return { transaction, receipt };
    } catch (error) {
      logger.error(`Error fetching transaction or receipt from ${chain}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TransactionService();
