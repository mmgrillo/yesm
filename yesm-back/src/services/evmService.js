const transactionService = require('./transactionService');
const TransactionDetailBuilder = require('./transactionDetailBuilder');
const { getApiUrlAndKey } = require('./apiService');
const logger = require('../utils/logger');
const initWeb3 = require('./web3Provider');

class EVMService {
  constructor() {
    this.web3 = initWeb3();
    this.transactionDetailBuilder = new TransactionDetailBuilder(this.web3);
  }

  async fetchTransactionDetails(txHash, chain) {
    try {
      const { transaction, receipt } = await transactionService.fetchTransactionAndReceipt(txHash, chain);
      const { apiUrl, apiKey } = getApiUrlAndKey(chain);
      return await this.transactionDetailBuilder.buildTransactionDetails(transaction, receipt, chain, apiUrl, apiKey);
    } catch (error) {
      logger.error(`Error fetching transaction details from ${chain}: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      throw error;
    }
  }

  async fetchWalletTransactions(walletAddress, chain) {
    const { apiUrl, apiKey } = getApiUrlAndKey(chain);

    try {
      const transactions = await transactionService.fetchTransactionsForWallet(walletAddress, apiUrl, apiKey);
      if (!transactions || transactions.length === 0) {
        throw new Error(`No transactions found for wallet address ${walletAddress} on ${chain}`);
      }

      const detailedTransactions = await Promise.all(transactions.map(async (transaction) => {
        const receipt = await transactionService.fetchReceipt(transaction.hash, chain);
        return this.transactionDetailBuilder.buildTransactionDetails(transaction, receipt, chain, apiUrl, apiKey);
      }));

      return detailedTransactions;
    } catch (error) {
      logger.error(`Error fetching transactions for wallet ${walletAddress} on ${chain}: ${error.message}`, {
        stack: error.stack,
        walletAddress,
        errorDetails: error,
      });
      throw error;
    }
  }
}

module.exports = new EVMService();