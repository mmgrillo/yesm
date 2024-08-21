const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

class EVMService {
  constructor() {
    this.web3 = null;
    this.initWeb3();
  }

  async initWeb3() {
    try {
      const Web3 = await import('web3');
      if (config.infuraProjectId) {
        this.web3 = new Web3.default(`https://mainnet.infura.io/v3/${config.infuraProjectId}`);
      } else {
        // Fallback to a public Ethereum node if Infura ID is not available
        this.web3 = new Web3.default('https://eth-mainnet.public.blastapi.io');
      }
      logger.info('Web3 initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Web3:', error);
    }
  }

  async fetchTransactionDetails(txHash, chain) {
    try {
      let apiUrl;
      let apiKey;

      switch (chain.toLowerCase()) {
        case 'ethereum':
          apiUrl = `https://api.etherscan.io/api`;
          apiKey = config.etherscanApiKey;
          break;
        case 'polygon':
          apiUrl = `https://api.polygonscan.com/api`;
          apiKey = config.polygonscanApiKey;
          break;
        case 'arbitrum':
          apiUrl = `https://api.arbiscan.io/api`;
          apiKey = config.arbitrumscanApiKey;
          break;
        case 'optimism':
          apiUrl = `https://api-optimistic.etherscan.io/api`;
          apiKey = config.optimismscanApiKey;
          break;
        case 'base':
          apiUrl = `https://api.basescan.org/api`;
          apiKey = config.basescanApiKey;
          break;
        case 'bsc':
          apiUrl = `https://api.bscscan.com/api`;
          apiKey = config.bscscanApiKey;
          break;
        default:
          throw new Error(`Chain ${chain} is not supported for fetching transaction details.`);
      }

      const response = await axios.get(apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: txHash,
          apikey: apiKey
        }
      });

      const transaction = response.data.result;

      if (!transaction) {
        throw new Error(`Transaction not found on ${chain}`);
      }

      const statusResponse = await axios.get(apiUrl, {
        params: {
          module: 'transaction',
          action: 'gettxreceiptstatus',
          txhash: txHash,
          apikey: apiKey
        }
      });

      const status = statusResponse.data.result.status;

      const fromWei = (value) => {
        try {
          return this.web3.utils.fromWei(value, 'ether');
        } catch (error) {
          logger.error('Error converting value to ether:', error);
          return value;
        }
      };

      /*
      const gas = this.web3.utils.toBN(transaction.gas);
      const gasPrice = this.web3.utils.toBN(transaction.gasPrice);
      const fee = gas.mul(gasPrice);
      */

      return {
        blockchain: chain,
        status: status === '1' ? 'Success' : 'Failed',
        amount: fromWei(transaction.value),
        amountUSD: 'N/A', // You'll need to implement price conversion
        //fee: fromWei(fee),
        feeUSD: 'N/A', // You'll need to implement price conversion
        from: transaction.from,
        to: transaction.to,
        confirmations: 'N/A', // This information might not be available from the API
        blockNumber: parseInt(transaction.blockNumber, 16),
        timestamp: transaction.timeStamp ? new Date(parseInt(transaction.timeStamp) * 1000).toISOString() : 'N/A'
      };
    } catch (error) {
      logger.error(`Error fetching transaction details from ${chain}: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      throw error;
    }
  }
}

module.exports = new EVMService();
