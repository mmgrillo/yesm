const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

class BitcoinService {
  async checkBitcoin(txHash) {
    try {
      const query = `
        query {
          bitcoin {
            transactions(txHash: {is: "${txHash}"}) {
              txHash
              blockNumber
              sender
              recipient
              value
              fee
              confirmations
              status
            }
          }
        }
      `;

      const response = await axios.post(
        'https://graphql.bitquery.io',
        { query },
        { headers: { 'X-API-KEY': config.bitqueryApiKey } }
      );

      if (response.data && response.data.data && response.data.data.bitcoin && response.data.data.bitcoin.transactions.length > 0) {
        logger.debug(`Transaction found on Bitcoin`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error checking Bitcoin: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return false;
    }
  }

  async fetchTransactionDetails(txHash) {
    try {
      const query = `
        query {
          bitcoin {
            transactions(txHash: {is: "${txHash}"}) {
              txHash
              blockNumber
              sender
              recipient
              value
              fee
              confirmations
              status
            }
          }
        }
      `;

      const response = await axios.post(
        'https://graphql.bitquery.io',
        { query },
        { headers: { 'X-API-KEY': config.bitqueryApiKey } }
      );

      const transaction = response.data.data.bitcoin.transactions[0];

      if (transaction) {
        return {
          blockchain: 'bitcoin',
          status: transaction.status || 'Pending',
          amount: transaction.value,
          fee: transaction.fee,
          from: transaction.sender,
          to: transaction.recipient,
          confirmations: transaction.confirmations,
          blockNumber: transaction.blockNumber,
        };
      } else {
        throw new Error('Transaction not found on Bitcoin');
      }
    } catch (error) {
      logger.error(`Error fetching Bitcoin transaction details: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return null;
    }
  }
}

module.exports = new BitcoinService();
