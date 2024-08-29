const { getTokenDetails, fromWei, getEthPrice, getTokenPrice } = require('./tokenService');
const logger = require('../utils/logger');

class TransactionDetailBuilder {
  constructor(web3) {
    this.web3 = web3;
  }

  async buildTransactionDetails(transaction, receipt, chain, apiUrl, apiKey) {
    const isSuccessful = receipt.status === '0x1';
    let amount = '0';
    let tokenSymbol = 'ETH';
    let tokenAddress = null;
    let isERC20 = false;
    let tokenDecimals = 18;

    let ethPriceAtTransaction = null;
    let valueWhenTransacted = 'N/A';
    let valueToday = 'N/A';

    try {
      if (BigInt(transaction.value) > 0) {
        amount = fromWei(transaction.value, 18);
        ethPriceAtTransaction = await getEthPrice(parseInt(receipt.blockNumber, 16));

        if (ethPriceAtTransaction) {
          valueWhenTransacted = (parseFloat(amount) * ethPriceAtTransaction).toFixed(2);
        } else {
          logger.warn('ETH price at transaction time could not be fetched. Proceeding with available information.');
        }
      } else {
        for (const log of receipt.logs) {
          if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            tokenAddress = log.address;
            amount = log.data;
            isERC20 = true;

            const { tokenDecimals: decimals, tokenSymbol: symbol } = await getTokenDetails(tokenAddress, apiUrl, apiKey);
            tokenDecimals = decimals;
            tokenSymbol = symbol;
            amount = fromWei(amount, tokenDecimals);

            const tokenPriceAtTransaction = await getTokenPrice(tokenAddress, parseInt(receipt.blockNumber, 16));
            if (tokenPriceAtTransaction !== null) {
              valueWhenTransacted = (parseFloat(amount) * tokenPriceAtTransaction).toFixed(2);
            } else {
              logger.warn('Token price at transaction time could not be fetched. Proceeding with available information.');
            }
            break;
          }
        }
      }

      const feeInEther = fromWei(BigInt(receipt.gasUsed) * BigInt(transaction.gasPrice), 18);
      const currentEthPrice = await getEthPrice();
      const currentTokenPrice = isERC20 ? await getTokenPrice(tokenAddress) : currentEthPrice;

      if (currentTokenPrice !== null) {
        valueToday = (parseFloat(amount) * currentTokenPrice).toFixed(2);
      } else {
        logger.warn('Current token price could not be fetched. Proceeding with available information.');
      }

      const difference = valueWhenTransacted !== 'N/A' && valueToday !== 'N/A'
        ? (parseFloat(valueToday) - parseFloat(valueWhenTransacted)).toFixed(2)
        : 'N/A';

      const currentBlockNumber = await this.web3.eth.getBlockNumber();
      const transactionBlockNumber = parseInt(receipt.blockNumber, 16);
      const confirmations = currentBlockNumber && transactionBlockNumber
        ? BigInt(currentBlockNumber) - BigInt(transactionBlockNumber)
        : 'N/A';

      let timestamp;
      if (transaction.timestamp) {
        timestamp = new Date(parseInt(transaction.timestamp) * 1000).toISOString();
      } else if (receipt.timestamp) {
        timestamp = new Date(parseInt(receipt.timestamp, 16) * 1000).toISOString();
      } else {
        timestamp = new Date().toISOString();
        logger.warn('No timestamp found in transaction or receipt. Using current time.');
      }

      return {
        blockchain: chain,
        status: isSuccessful ? 'Success' : 'Failed',
        amount: `${amount} ${tokenSymbol}`,
        valueWhenTransacted: valueWhenTransacted !== 'N/A' ? `$${valueWhenTransacted}` : 'N/A',
        valueToday: valueToday !== 'N/A' ? `$${valueToday}` : 'N/A',
        difference: difference,
        fee: `${feeInEther} ETH`,
        from: transaction.from,
        to: transaction.to,
        confirmations: confirmations !== 'N/A' ? confirmations.toString() : 'N/A',
        blockNumber: transactionBlockNumber,
        timestamp: timestamp,
        hash: transaction.hash,
      };
    } catch (error) {
      logger.error('Error building transaction details:', error.message, { context: error });
      throw error;
    }
  }
}

module.exports = TransactionDetailBuilder;