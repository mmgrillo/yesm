const transactionService = require('./transactionService');
const TransactionDetailBuilder = require('./transactionDetailBuilder');
const { getApiUrlAndKey } = require('./apiService');
const logger = require('../utils/logger');
const initWeb3 = require('./web3Provider');

class EVMService {
  constructor() {
    // Initialize Web3 using your Web3Provider setup
    this.web3 = initWeb3();
    this.transactionDetailBuilder = new TransactionDetailBuilder(this.web3);
  }

  // Helper to convert values from Wei to Ether
  fromWei(value) {
    try {
      return this.web3.utils.fromWei(value, 'ether');
    } catch (error) {
      logger.error('Error converting value to ether:', error);
      return value;
    }
  }

  // Fetch transaction details and handle timestamp formatting
  async fetchTransactionDetails(txHash, chain) {
    try {
      // Fetch both the transaction and its receipt
      const { transaction, receipt } = await transactionService.fetchTransactionAndReceipt(txHash, chain);
      const { apiUrl, apiKey } = getApiUrlAndKey(chain);

      // Build the transaction details
      const transactionDetails = await this.transactionDetailBuilder.buildTransactionDetails(
        transaction, receipt, chain, apiUrl, apiKey
      );

      // Ensure timestamp is properly formatted and handled
      transactionDetails.timestamp = transaction.timeStamp
        ? new Date(parseInt(transaction.timeStamp) * 1000).toISOString()
        : 'N/A';  // Set a default value if no timestamp is available

      // Add fee and amount conversion
      transactionDetails.fee = this.web3 ? this.fromWei(
        this.web3.utils.toBN(transaction.gas).mul(this.web3.utils.toBN(transaction.gasPrice))
      ) : 'N/A';

      transactionDetails.amount = this.fromWei(transaction.value);

      return transactionDetails;
    } catch (error) {
      logger.error(`Error fetching transaction details from ${chain}: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      throw error;
    }
  }

  // Fetch wallet transactions for the specified chain
  async fetchWalletTransactions(walletAddress, chain) {
    const { apiUrl, apiKey } = getApiUrlAndKey(chain);

    try {
      // Fetch transactions for the wallet
      const transactions = await transactionService.fetchTransactionsForWallet(walletAddress, apiUrl, apiKey);
      if (!transactions || transactions.length === 0) {
        throw new Error(`No transactions found for wallet address ${walletAddress} on ${chain}`);
      }

      // Build detailed transaction information
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
