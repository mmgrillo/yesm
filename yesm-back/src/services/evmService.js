const Web3 = require('web3').default; // Ensure we use the correct import
const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

class EVMService {
  constructor() {
    this.web3 = null;
    this.initWeb3();
  }

  initWeb3() {
    try {
      // Initialize Web3 directly with the provider URL
      this.web3 = new Web3(
        config.infuraProjectId 
          ? `https://mainnet.infura.io/v3/${config.infuraProjectId}`
          : 'https://eth-mainnet.public.blastapi.io'
      );
      logger.info('Web3 initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Web3:', error);
      throw error; // Throw error to prevent further execution if Web3 fails to initialize
    }
  }

  fromWei(value, unit = 'ether') {
    const units = {
        'wei': BigInt('1'),
        'kwei': BigInt('1000'),
        'mwei': BigInt('1000000'),
        'gwei': BigInt('1000000000'),
        'ether': BigInt('1000000000000000000')
    };
    const divisor = units[unit];
    const result = BigInt(value) * 100000n / divisor; // Multiply by 100000 to retain precision
    return (result / 100000n).toString() + '.' + (result % 100000n).toString().padStart(5, '0');
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

      const gas = BigInt(transaction.gas);
      const gasPrice = BigInt(transaction.gasPrice);

      const fee = gas * gasPrice;  // Calculate fee as gas * gasPrice

      const feeInEther = this.fromWei(fee.toString()); // Convert fee to Ether

      const currentBlockNumber = BigInt(await this.web3.eth.getBlockNumber());
      const transactionBlockNumber = BigInt(parseInt(transaction.blockNumber, 16));
      const confirmations = currentBlockNumber - transactionBlockNumber;

      return {
        blockchain: chain,
        status: status === '1' ? 'Success' : 'Failed',
        amount: this.fromWei(transaction.value), // Using the custom fromWei method
        amountUSD: 'N/A', // You'll need to implement price conversion
        fee: feeInEther, // Using the custom fromWei method for fee
        feeUSD: 'N/A', // You'll need to implement price conversion
        from: transaction.from,
        to: transaction.to,
        confirmations: confirmations >= 0 ? confirmations.toString() : 'N/A', // Ensure confirmations are included
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
