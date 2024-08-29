const Web3 = require('web3').default;
const axios = require('axios');
const logger = require('../utils/logger');
const CustomError = require('../utils/customError');

const web3 = new Web3('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');

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

const getEthPrice = async (timestamp = null) => {
  try {
    let response;
    if (timestamp) {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      const formattedDate = date.split('-').reverse().join('-');
      response = await axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/history`, {
        params: { date: formattedDate, localization: 'false' }
      });
    } else {
      response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: { ids: 'ethereum', vs_currencies: 'usd' }
      });
    }

    if (response && response.data) {
      if (response.data.market_data && response.data.market_data.current_price && response.data.market_data.current_price.usd) {
        return response.data.market_data.current_price.usd;
      } else if (response.data.ethereum && response.data.ethereum.usd) {
        return response.data.ethereum.usd;
      } else {
        logger.error(`Unexpected response structure from Coingecko ETH price API: ${JSON.stringify(response.data)}`);
        return null;
      }
    } else {
      logger.error(`No data received from Coingecko ETH price API: ${JSON.stringify(response)}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error fetching ETH price from Coingecko: ${error.message}`);

    // Fallback to Dexscreener API
    try {
      const dexScreenerResponse = await axios.get('https://api.dexscreener.com/latest/dex/tokens/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
      if (dexScreenerResponse && dexScreenerResponse.data) {
        const ethPrice = dexScreenerResponse.data.pairs?.[0]?.priceUsd;
        if (ethPrice) {
          logger.info('Fetched ETH price from Dexscreener as a fallback.');
          return parseFloat(ethPrice);
        } else {
          logger.error(`Unexpected response structure from Dexscreener ETH price API: ${JSON.stringify(dexScreenerResponse.data)}`);
          return null;
        }
      } else {
        logger.error(`No data received from Dexscreener ETH price API: ${JSON.stringify(dexScreenerResponse)}`);
        return null;
      }
    } catch (fallbackError) {
      logger.error(`Error fetching ETH price from Dexscreener: ${fallbackError.message}`);
      return null;
    }
  }
};

const getTokenPrice = async (tokenAddress, timestamp = null) => {
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
      } else {
        logger.error(`Unexpected response structure from historical token price API: ${JSON.stringify(response.data)}`);
        return null;
      }
    } else {
      if (response.data && response.data[tokenAddress.toLowerCase()] && response.data[tokenAddress.toLowerCase()].usd) {
        return response.data[tokenAddress.toLowerCase()].usd;
      } else {
        logger.error(`Unexpected response structure from current token price API: ${JSON.stringify(response.data)}`);
        return null;
      }
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        logger.error(`Token price for ${tokenAddress} not found (404).`);
      } else if (error.response.status === 429) {
        logger.error(`Rate limit exceeded (429).`);
      }
    } else {
      logger.error(`Error fetching token price for ${tokenAddress}: ${error.message}`);
    }
    return null;
  }
};

module.exports = { getTokenDetails, fromWei, getEthPrice, getTokenPrice };