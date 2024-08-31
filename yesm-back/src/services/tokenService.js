const Web3 = require('web3').default;
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

const web3 = new Web3('https://mainnet.infura.io/v3/' + config.infuraProjectId);

const getTokenDetails = async (tokenAddress, apiUrl, apiKey) => {
  try {
    const [decimalsResponse, symbolResponse] = await Promise.all([
      axios.get(apiUrl, {
        params: { module: 'proxy', action: 'eth_call', to: tokenAddress, data: '0x313ce567', tag: 'latest', apikey: apiKey }
      }),
      axios.get(apiUrl, {
        params: { module: 'proxy', action: 'eth_call', to: tokenAddress, data: '0x95d89b41', tag: 'latest', apikey: apiKey }
      })
    ]);

    const tokenDecimals = parseInt(decimalsResponse.data.result, 16);
    const tokenSymbol = web3.utils.hexToUtf8(symbolResponse.data.result).trim().replace(/\0/g, '');

    return { tokenDecimals, tokenSymbol };
  } catch (error) {
    logger.error(`Error fetching token details for token address: ${tokenAddress}`, error);
    return { tokenDecimals: 18, tokenSymbol: 'UNKNOWN' };
  }
};

const fromWei = (value, decimals = 18) => {
  const divisor = BigInt(10) ** BigInt(decimals);
  const result = (BigInt(value) * BigInt(100000)) / divisor;
  return (Number(result) / 100000).toFixed(5);
};

const getEthPrice = async (blockNumber) => {
  try {
    logger.debug(`Fetching ETH price for block number: ${blockNumber}`);
    
    // First, get the timestamp for the block
    const timestamp = await getBlockTimestamp(blockNumber);
    logger.debug(`Block timestamp: ${timestamp}`);

    let price = await getEthPriceFromCoingecko(timestamp);
    if (price === null) {
      price = await getEthPriceFromCryptoCompare(timestamp);
    }
    if (price === null) {
      logger.warn(`Failed to fetch ETH price for timestamp ${timestamp}`);
    } else {
      logger.debug(`Successfully fetched ETH price: ${price}`);
    }
    return price;
  } catch (error) {
    logger.error(`Error fetching ETH price: ${error.message}`);
    return null;
  }
};

const getBlockTimestamp = async (blockNumber) => {
  try {
    const response = await axios.get(`https://api.etherscan.io/api`, {
      params: {
        module: 'block',
        action: 'getblockreward',
        blockno: blockNumber,
        apikey: config.etherscanApiKey
      }
    });
    if (response.data && response.data.result && response.data.result.timeStamp) {
      return parseInt(response.data.result.timeStamp);
    }
    throw new Error('Failed to fetch block timestamp');
  } catch (error) {
    logger.error(`Error fetching block timestamp: ${error.message}`);
    return Math.floor(Date.now() / 1000); // fallback to current timestamp
  }
};

const getEthPriceFromCoingecko = async (timestamp) => {
  try {
    logger.debug(`Fetching ETH price from Coingecko for timestamp: ${timestamp}`);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const formattedDate = date.split('-').reverse().join('-');
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/history`, {
      params: { date: formattedDate, localization: 'false' }
    });

    if (response.data && response.data.market_data && response.data.market_data.current_price && response.data.market_data.current_price.usd) {
      const price = response.data.market_data.current_price.usd;
      logger.debug(`Coingecko returned ETH price: ${price}`);
      return price;
    }
    logger.warn('Coingecko response did not contain expected price data');
    return null;
  } catch (error) {
    logger.error(`Error fetching ETH price from Coingecko: ${error.message}`);
    return null;
  }
};

const getEthPriceFromCryptoCompare = async (timestamp) => {
  try {
    logger.debug(`Fetching ETH price from CryptoCompare for timestamp: ${timestamp}`);
    const response = await axios.get('https://min-api.cryptocompare.com/data/v2/histoday', {
      params: {
        fsym: 'ETH',
        tsym: 'USD',
        limit: 1,
        toTs: timestamp
      },
      headers: {
        'Authorization': `Apikey ${config.cryptoCompareApiKey}`
      }
    });

    if (response.data && response.data.Data && response.data.Data.Data && response.data.Data.Data[0]) {
      const price = response.data.Data.Data[0].close;
      logger.debug(`CryptoCompare returned ETH price: ${price}`);
      return price;
    }
    logger.warn('CryptoCompare response did not contain expected price data');
    return null;
  } catch (error) {
    logger.error(`Error fetching ETH price from CryptoCompare: ${error.message}`);
    return null;
  }
};

const getTokenPrice = async (tokenAddress, timestamp = null) => {
  try {
    let price = await getTokenPriceFromCoingecko(tokenAddress, timestamp);
    if (price === null) {
      price = await getTokenPriceFromCryptoCompare(tokenAddress, timestamp);
    }
    if (price === null) {
      logger.warn(`Failed to fetch token price for address ${tokenAddress} and timestamp ${timestamp}`);
    }
    return price;
  } catch (error) {
    logger.error(`Error fetching token price for ${tokenAddress}: ${error.message}`);
    return null;
  }
};

const getTokenPriceFromCoingecko = async (tokenAddress, timestamp = null) => {
  try {
    let url, params;
    if (timestamp) {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      const formattedDate = date.split('-').reverse().join('-');
      url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}/history`;
      params = { date: formattedDate, localization: 'false' };
    } else {
      url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum`;
      params = { contract_addresses: tokenAddress, vs_currencies: 'usd' };
    }

    const response = await axios.get(url, { params });

    if (timestamp) {
      if (response.data && response.data.market_data && response.data.market_data.current_price && response.data.market_data.current_price.usd) {
        return response.data.market_data.current_price.usd;
      }
    } else {
      if (response.data && response.data[tokenAddress.toLowerCase()] && response.data[tokenAddress.toLowerCase()].usd) {
        return response.data[tokenAddress.toLowerCase()].usd;
      }
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching token price from Coingecko: ${error.message}`);
    return null;
  }
};

const getTokenPriceFromCryptoCompare = async (tokenAddress, timestamp = null) => {
  try {
    // First, we need to get the token symbol from the contract address
    const { tokenSymbol } = await getTokenDetails(tokenAddress, `https://api.etherscan.io/api`, config.etherscanApiKey);
    
    let url = 'https://min-api.cryptocompare.com/data/price';
    let params = { fsym: tokenSymbol, tsyms: 'USD' };

    if (timestamp) {
      url = 'https://min-api.cryptocompare.com/data/v2/histoday';
      params = { fsym: tokenSymbol, tsym: 'USD', limit: 1, toTs: timestamp };
    }

    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Apikey ${config.cryptoCompareApiKey}`
      }
    });

    if (timestamp) {
      if (response.data && response.data.Data && response.data.Data.Data && response.data.Data.Data[0]) {
        return response.data.Data.Data[0].close;
      }
    } else {
      if (response.data && response.data.USD) {
        return response.data.USD;
      }
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching token price from CryptoCompare: ${error.message}`);
    return null;
  }
};

module.exports = { getTokenDetails, fromWei, getEthPrice, getTokenPrice };