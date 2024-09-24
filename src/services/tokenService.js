// src/services/tokenService.js
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

// Function to fetch both current and historical prices and calculate trade performance from Zerion API
const getTradePerformance = async (tokenAddress, soldAmount, soldTimestamp) => {
  try {
    // Fetch historical price when the token was sold from Zerion
    const soldPrice = await getTokenPriceFromZerion(tokenAddress, soldTimestamp);
    // Fetch current price of the token from Zerion
    const currentPrice = await getTokenPriceFromZerion(tokenAddress);

    // Calculate performance as percentage
    const soldValueThen = soldAmount * soldPrice;
    const currentValueNow = soldAmount * currentPrice;
    const performance = ((currentValueNow - soldValueThen) / soldValueThen) * 100;

    return { performance: performance.toFixed(2), soldPrice, currentPrice };
  } catch (error) {
    logger.error(`Error calculating trade performance: ${error.message}`);
    return { performance: null, soldPrice: null, currentPrice: null };
  }
};

// Fetch token price from Zerion API
const getTokenPriceFromZerion = async (tokenAddress, timestamp = null) => {
  try {
    let url = `https://api.zerion.io/v1/assets/${tokenAddress}/price`;
    if (timestamp) {
      url += `?timestamp=${timestamp}`;
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${config.zerionApiKey}`,
      },
    });

    return response.data.data.price;
  } catch (error) {
    logger.error(`Error fetching token price from Zerion: ${error.message}`);
    return null;
  }
};

module.exports = { getTradePerformance };
