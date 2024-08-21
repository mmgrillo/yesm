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
}

module.exports = new BitcoinService();
