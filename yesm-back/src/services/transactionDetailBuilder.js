const getTokenDetails = require('./tokenService');
const getTransactionExplanation = require('./transactionExplanations');
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
    let transactionTimestamp = null;

    let transactionMethod = this.getTransactionMethod(transaction);
    let explanation = getTransactionExplanation(transactionMethod); // Get explanation for the transaction method
    let swapInfo = null;

    try {
      // Fetch the block to get the transaction timestamp
      if (receipt.blockNumber) {
        const block = await this.web3.eth.getBlock(receipt.blockNumber);
        transactionTimestamp = block.timestamp || null;
      } else if (transaction.blockNumber) {
        const block = await this.web3.eth.getBlock(transaction.blockNumber);
        transactionTimestamp = block.timestamp || null;
      }

      if (!transactionTimestamp) {
        logger.warn('Transaction timestamp is null, using fallback timestamp.');
        transactionTimestamp = Math.floor(Date.now() / 1000); // Fallback to current time
      }

      // Extract swap info if the transaction is a swap
      if (this.isSwapTransaction(transaction)) {
        swapInfo = await this.extractSwapInfo(transaction, receipt, apiUrl, apiKey);
      }

      // If ETH is transferred
      if (BigInt(transaction.value) > 0n) {
        amount = fromWei(transaction.value, 18);

        ethPriceAtTransaction = await this.getPriceForChain(transactionTimestamp, chain);
        if (ethPriceAtTransaction) {
          valueWhenTransacted = (parseFloat(amount) * ethPriceAtTransaction).toFixed(2);
        }
      } else {
        // Handle ERC-20 transfers
        for (const log of receipt.logs) {
          if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            tokenAddress = log.address;
            amount = log.data;
            isERC20 = true;

            const { tokenDecimals: decimals, tokenSymbol: symbol } = await getTokenDetails(tokenAddress, apiUrl, apiKey);
            tokenDecimals = decimals;
            tokenSymbol = symbol.replace(/[^\x20-\x7E]/g, ''); // Clean token symbol
            amount = fromWei(amount, tokenDecimals);

            // Get token price at the time of the transaction
            const tokenPriceAtTransaction = await this.getTokenPriceForChain(tokenAddress, transactionTimestamp, chain);
            if (tokenPriceAtTransaction !== null) {
              valueWhenTransacted = (parseFloat(amount) * tokenPriceAtTransaction).toFixed(2);
            }
            break;
          }
        }
      }

      // Calculate the fee paid in Ether
      const feeInEther = fromWei(BigInt(receipt.gasUsed) * BigInt(transaction.gasPrice), 18);

      // Get the current price of the token
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const currentPrice = isERC20
        ? await this.getTokenPriceForChain(tokenAddress, null, chain)
        : await this.getPriceForChain(currentTimestamp, chain);

      if (currentPrice !== null) {
        valueToday = (parseFloat(amount) * currentPrice).toFixed(2);
      }

      // Calculate the difference between the transacted value and today's value
      const difference = valueWhenTransacted !== 'N/A' && valueToday !== 'N/A'
        ? (parseFloat(valueToday) - parseFloat(valueWhenTransacted)).toFixed(2)
        : 'N/A';

      // Get the number of confirmations
      const currentBlockNumber = await this.web3.eth.getBlockNumber();
      const transactionBlockNumber = parseInt(receipt.blockNumber, 16);
      const confirmations = currentBlockNumber && transactionBlockNumber
        ? (BigInt(currentBlockNumber) - BigInt(transactionBlockNumber)).toString()
        : 'N/A';

      // Return the transaction details
      return {
        blockchain: chain,
        status: isSuccessful ? 'Success' : 'Failed',
        method: transactionMethod,
        explanation,  // Include explanation from backend
        swapInfo,     // Include swap info if available
        amount: `${amount} ${tokenSymbol}`,
        valueWhenTransacted: valueWhenTransacted !== 'N/A' ? `$${valueWhenTransacted}` : 'N/A',
        valueToday: valueToday !== 'N/A' ? `$${valueToday}` : 'N/A',
        difference: difference,
        fee: `${feeInEther} ETH`,
        from: transaction.from,
        to: transaction.to,
        confirmations: confirmations,
        blockNumber: transactionBlockNumber,
        timestamp: new Date(transactionTimestamp * 1000).toLocaleString(),
        hash: transaction.hash,
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

  isSwapTransaction(transaction) {
    return this.getTransactionMethod(transaction) === 'Swap';
  }

  async extractSwapInfo(transaction, receipt, apiUrl, apiKey) {
    try {
      const decodedInput = this.web3.eth.abi.decodeParameters(
        ['address[]', 'uint256', 'uint256', 'uint256[]'],
        '0x' + transaction.input.slice(10)
      );

      const path = decodedInput[0];
      const amountIn = fromWei(decodedInput[1], 18);
      const amountOutMin = fromWei(decodedInput[2], 18);

      const fromToken = await getTokenDetails(path[0], apiUrl, apiKey);
      const toToken = await getTokenDetails(path[path.length - 1], apiUrl, apiKey);

      return {
        fromToken: fromToken.tokenSymbol,
        toToken: toToken.tokenSymbol,
        amountIn: amountIn,
        amountOutMin: amountOutMin,
      };
    } catch (error) {
      logger.error('Error extracting swap info:', error.message);
      return null;
    }
  }

  async getPriceForChain(timestamp, chain) {
    if (chain.toLowerCase() === 'ethereum' || chain.toLowerCase() === 'arbitrum') {
      return await getEthPrice(timestamp);
    }
    // Add more chains as necessary
    return null;
  }

  async getTokenPriceForChain(tokenAddress, timestamp, chain) {
    if (chain.toLowerCase() === 'ethereum' || chain.toLowerCase() === 'arbitrum') {
      return await getTokenPrice(tokenAddress, timestamp);
    }
    // Add more chains as necessary
    return null;
  }
}

module.exports = TransactionDetailBuilder;