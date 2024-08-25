const Web3 = require('web3').default;
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
      this.web3 = new Web3(
        config.infuraProjectId 
          ? `https://mainnet.infura.io/v3/${config.infuraProjectId}`
          : 'https://eth-mainnet.public.blastapi.io'
      );
      logger.info('Web3 initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Web3:', error);
      throw error;
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
    const result = BigInt(value) * 100000n / divisor;
    return (result / 100000n).toString() + '.' + (result % 100000n).toString().padStart(5, '0');
  }

  async getEthPriceAtTimestamp(timestamp) {
    try {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      const formattedDate = date.split('-').reverse().join('-');
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/history`, {
        params: {
          date: formattedDate,
          localization: 'false'
        }
      });

      const price = response.data.market_data?.current_price?.usd || null;
      if (!price) {
        logger.error(`No price data available for ETH on date ${formattedDate}`);
      }

      return price;
    } catch (error) {
      logger.error(`Error fetching historical ETH price: ${error.message}`);
      return null;
    }
  }

  async getCurrentEthPrice() {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'ethereum',
          vs_currencies: 'usd'
        }
      });
      return response.data.ethereum?.usd || null;
    } catch (error) {
      logger.error(`Error fetching current ETH price: ${error.message}`);
      return null;
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

      const gas = BigInt(transaction.gas);
      const gasPrice = BigInt(transaction.gasPrice);

      const fee = gas * gasPrice;
      const feeInEther = this.fromWei(fee.toString());

      const currentBlockNumber = BigInt(await this.web3.eth.getBlockNumber());
      const transactionBlockNumber = BigInt(parseInt(transaction.blockNumber, 16));
      const confirmations = currentBlockNumber - transactionBlockNumber;

      const blockResponse = await axios.get(apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getBlockByNumber',
          tag: transaction.blockNumber,
          boolean: 'false',
          apikey: apiKey
        }
      });

      const block = blockResponse.data.result;
      const timestamp = block ? parseInt(block.timestamp, 16) : null;

      const ethPriceAtTransaction = timestamp ? await this.getEthPriceAtTimestamp(timestamp) : null;
      const currentEthPrice = await this.getCurrentEthPrice();

      const amountInEther = this.fromWei(transaction.value);
      const valueWhenTransacted = ethPriceAtTransaction ? (parseFloat(amountInEther) * ethPriceAtTransaction).toFixed(2) : 'N/A';
      const valueToday = currentEthPrice ? (parseFloat(amountInEther) * currentEthPrice).toFixed(2) : 'N/A';

      // Calculate fee in USD at the time of transaction
      const feeInUsdAtTransaction = ethPriceAtTransaction ? (parseFloat(feeInEther) * ethPriceAtTransaction).toFixed(2) : 'N/A';

      // Calculate the difference between the past value and current value
      const valueDifference = valueWhenTransacted !== 'N/A' && valueToday !== 'N/A' 
        ? (parseFloat(valueToday) - parseFloat(valueWhenTransacted)).toFixed(2)
        : 'N/A';
      const gainOrLoss = valueDifference !== 'N/A' 
        ? valueDifference > 0 
          ? `🙂 +$${valueDifference}` 
          : `☹️ -$${Math.abs(valueDifference)}`
        : 'N/A';

      return {
        blockchain: chain,
        status: status === '1' ? 'Success' : 'Failed',
        amount: amountInEther,
        amountUSD: valueWhenTransacted,
        fee: feeInEther,
        feeUSD: feeInUsdAtTransaction,
        from: transaction.from,
        to: transaction.to,
        confirmations: confirmations >= 0 ? confirmations.toString() : 'N/A',
        blockNumber: parseInt(transaction.blockNumber, 16),
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : 'N/A',
        valueWhenTransacted: valueWhenTransacted,
        valueToday: valueToday,
        gainOrLoss: gainOrLoss, 
        hash: txHash
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
