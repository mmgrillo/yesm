const ApiService = require('./apiService');
const getTransactionExplanation = require('./transactionExplanations');
const logger = require('../utils/logger');

class TransactionDetailBuilder {
  constructor(web3) {
    this.web3 = web3;
  }

  async buildTransactionDetails(transaction, receipt, chain) {
    const isSuccessful = receipt.status === '0x1';
    let amount = '0';
    let tokenSymbol = 'ETH';
    let tokenAddress = null;
    let isERC20 = false;
    let tokenDecimals = 18;

    let ethPriceAtTransaction = null;
    let valueWhenTransacted = 'N/A';
    let valueToday = 'N/A';
    let transactionTimestamp = null;

    let transactionMethod = this.getTransactionMethod(transaction);
    let explanation = getTransactionExplanation(transactionMethod); // Get explanation for the transaction method

    try {
      // Fetch the block to get the transaction timestamp
      if (receipt.blockNumber) {
        const block = await this.web3.eth.getBlock(receipt.blockNumber);
        transactionTimestamp = block.timestamp || null;
      }

      if (!transactionTimestamp) {
        logger.warn('Transaction timestamp is null, using fallback timestamp.');
        transactionTimestamp = Math.floor(Date.now() / 1000); // Fallback to current time
      }

      // Handle token transfers
      if (BigInt(transaction.value) > 0n) {
        amount = fromWei(transaction.value, 18);

        // Fetch historical and current prices using ApiService.fetchTokenPrices
        const prices = await ApiService.fetchTokenPrices([{ chain: 'eth', address: 'eth' }]);
        ethPriceAtTransaction = prices['eth:eth']?.usd || 0;

        if (ethPriceAtTransaction) {
          valueWhenTransacted = (parseFloat(amount) * ethPriceAtTransaction).toFixed(2);
        }
      }

      // Calculate the current price and performance using ApiService.fetchTokenPrices
      const tradePerformance = await ApiService.fetchTokenPrices([{ chain: 'eth', address: tokenAddress }]);
      const currentPrice = tradePerformance[`eth:${tokenAddress.toLowerCase()}`]?.usd || 0;
      const valueToday = currentPrice;

      const difference = valueWhenTransacted !== 'N/A' && valueToday !== 'N/A'
        ? (parseFloat(valueToday) - parseFloat(valueWhenTransacted)).toFixed(2)
        : 'N/A';

      // Return the transaction details
      return {
        blockchain: chain,
        status: isSuccessful ? 'Success' : 'Failed',
        method: transactionMethod,
        explanation,
        amount: `${amount} ${tokenSymbol}`,
        valueWhenTransacted: `$${valueWhenTransacted}`,
        valueToday: `$${valueToday}`,
        difference: difference,
      };
    } catch (error) {
      logger.error('Error building transaction details:', error.message, { context: error });
      throw error;
    }
  }

  getTransactionMethod(transaction) {
    if (transaction.input && transaction.input.length >= 10) {
      const methodSignature = transaction.input.slice(0, 10);
      switch (methodSignature) {
        case '0x38ed1739': return 'Swap';
        case '0xa9059cbb': return 'Transfer';
        case '0x095ea7b3': return 'Approve';
        default: return 'Unknown';
      }
    }
    return 'Transfer';
  }
}

module.exports = TransactionDetailBuilder;
