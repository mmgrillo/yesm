const transactionService = require('./transactionService');
const TransactionDetailBuilder = require('./transactionDetailBuilder');
const { getApiUrlAndKey } = require('./apiService');
const logger = require('../utils/logger');
const tokenService = require('./tokenService'); // Import tokenService

class EVMService {
  constructor() {
    this.web3 = initWeb3();
    this.transactionDetailBuilder = new TransactionDetailBuilder(this.web3);
  }

  async fetchTransactionDetails(txHash, chain) {
    try {
      const { transaction, receipt } = await transactionService.fetchTransactionAndReceipt(txHash, chain);
      const { apiUrl, apiKey } = getApiUrlAndKey(chain);

      const transactionDetails = await this.transactionDetailBuilder.buildTransactionDetails(
        transaction, receipt, chain, apiUrl, apiKey
      );

      transactionDetails.timestamp = transaction.timeStamp
        ? new Date(parseInt(transaction.timeStamp) * 1000).toISOString()
        : 'N/A';

      transactionDetails.fee = this.web3 ? this.fromWei(
        this.web3.utils.toBN(transaction.gas).mul(this.web3.utils.toBN(transaction.gasPrice))
      ) : 'N/A';

      transactionDetails.amount = this.fromWei(transaction.value);

      // NEW: Calculate trade performance for tokens sold
      if (transaction.to && transaction.input) {
        const tokenAddress = transaction.to;
        const soldAmount = transactionDetails.amount;
        const soldTimestamp = transactionDetails.timestamp;

        const tradePerformance = await tokenService.getTradePerformance(tokenAddress, soldAmount, soldTimestamp);
        transactionDetails.tradePerformance = tradePerformance.performance;
        transactionDetails.soldPrice = tradePerformance.soldPrice;
        transactionDetails.currentPrice = tradePerformance.currentPrice;
      }

      return transactionDetails;
    } catch (error) {
      logger.error(`Error fetching transaction details from ${chain}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EVMService();
