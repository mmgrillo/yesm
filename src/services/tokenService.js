const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

const getTradePerformance = async (tokenAddress, soldAmount, soldTimestamp) => {
  try {
    const soldPrice = await getTokenPriceFromZerion(tokenAddress, soldTimestamp);
    const currentPrice = await getTokenPriceFromZerion(tokenAddress);

    const soldValue = soldAmount * soldPrice;
    const currentValue = soldAmount * currentPrice;
    const performance = ((currentValue - soldValue) / soldValue) * 100;

    return { performance: performance.toFixed(2), soldPrice, currentPrice };
  } catch (error) {
    logger.error(`Error calculating trade performance: ${error.message}`);
    return { performance: null, soldPrice: null, currentPrice: null };
  }
};

module.exports = { getTradePerformance };
