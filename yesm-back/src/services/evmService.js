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
          action: 'eth_getTransactionReceipt',
          txhash: txHash,
          apikey: apiKey
        }
      });

      const transactionReceipt = response.data.result;

      if (!transactionReceipt) {
        throw new Error(`Transaction not found on ${chain}`);
      }

      const status = transactionReceipt.status;
      const isSuccessful = status === '0x1';

      const logs = transactionReceipt.logs || [];
      let amountInEther = '0';
      let tokenSymbol = 'ETH';

      // Handle ERC-20 token transactions
      for (const log of logs) {
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          // This is an ERC-20 transfer
          const tokenAddress = log.address;
          const tokenValue = log.data;

          try {
            // Fetch token decimals
            let tokenDecimalsResponse = await axios.get(apiUrl, {
              params: {
                module: 'proxy',
                action: 'eth_call',
                to: tokenAddress,
                data: '0x313ce567', // Function selector for decimals()
                tag: 'latest',
                apikey: apiKey
              }
            });

            let tokenDecimals = parseInt(tokenDecimalsResponse.data.result, 16);

            if (isNaN(tokenDecimals) || tokenDecimals === 0) {
              logger.warn(`Invalid token decimals for token address: ${tokenAddress}. Defaulting to 18.`);
              tokenDecimals = 18; // Defaulting to standard 18 decimals for ERC-20 tokens
            }

            // Safely convert tokenValue and calculate amountInEther
            const tokenValueBigInt = BigInt(tokenValue);
            const divisorBigInt = BigInt(10 ** tokenDecimals);
            amountInEther = (tokenValueBigInt / divisorBigInt).toString();
          } catch (err) {
            logger.error(`Error fetching token decimals for token address: ${tokenAddress}, defaulting decimals to 18`, err);
            amountInEther = '0'; // Fallback if something goes wrong
          }

          try {
            // Fetch token symbol
            const tokenSymbolResponse = await axios.get(apiUrl, {
              params: {
                module: 'proxy',
                action: 'eth_call',
                to: tokenAddress,
                data: '0x95d89b41', // Function selector for symbol()
                tag: 'latest',
                apikey: apiKey
              }
            });

            tokenSymbol = tokenSymbolResponse.data.result ? Web3.utils.hexToUtf8(tokenSymbolResponse.data.result) : 'ERC20';
          } catch (err) {
            logger.error(`Error fetching token symbol for token address: ${tokenAddress}, defaulting to 'ERC20'`, err);
            tokenSymbol = 'ERC20'; // Default fallback
          }

          break;
        }
      }

      const currentBlockNumber = BigInt(await this.web3.eth.getBlockNumber());
      const transactionBlockNumber = BigInt(parseInt(transactionReceipt.blockNumber, 16));
      const confirmations = currentBlockNumber - transactionBlockNumber;

      const blockResponse = await axios.get(apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getBlockByNumber',
          tag: transactionReceipt.blockNumber,
          boolean: 'false',
          apikey: apiKey
        }
      });

      const block = blockResponse.data.result;
      const timestamp = block ? parseInt(block.timestamp, 16) : null;

      if (!timestamp || timestamp === 0) {
        logger.error('Invalid timestamp received from block data.');
        return null;
      }

      const ethPriceAtTransaction = timestamp ? await this.getEthPriceAtTimestamp(timestamp) : null;
      const currentEthPrice = await this.getCurrentEthPrice();

      const valueWhenTransacted = ethPriceAtTransaction ? (parseFloat(amountInEther) * ethPriceAtTransaction).toFixed(2) : 'N/A';
      const valueToday = currentEthPrice ? (parseFloat(amountInEther) * currentEthPrice).toFixed(2) : 'N/A';

      // Convert fee from hexadecimal to decimal
      const feeInDecimal = parseInt(transactionReceipt.gasUsed, 16).toString();

      return {
        blockchain: chain,
        status: isSuccessful ? 'Success' : 'Failed',
        amount: `${amountInEther} ${tokenSymbol}`,
        amountUSD: valueWhenTransacted,
        fee: feeInDecimal,
        feeUSD: 'N/A', // Adjust fee logic as needed
        from: transactionReceipt.from,
        to: transactionReceipt.to,
        confirmations: confirmations >= 0 ? confirmations.toString() : 'N/A',
        blockNumber: parseInt(transactionReceipt.blockNumber, 16),
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : 'N/A',
        valueWhenTransacted: valueWhenTransacted,
        valueToday: valueToday,
        gainOrLoss: 'N/A', // Adjust gain/loss calculation as needed
        hash: txHash // Include the transaction hash
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
