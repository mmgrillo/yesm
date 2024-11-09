const ApiService = require('./apiService');

const getTradePerformance = async (tokenAddress, soldAmount) => {
  try {
    const prices = await ApiService.fetchTokenPrices([{ chain: 'eth', address: tokenAddress }]);
    const currentPrice = prices[`eth:${tokenAddress.toLowerCase()}`]?.usd || 0;
    const soldPrice = prices[`eth:${tokenAddress.toLowerCase()}`]?.usd || 0;
    
    const soldValue = soldAmount * soldPrice;
    const currentValue = soldAmount * currentPrice;
    const performance = ((currentValue - soldValue) / soldValue) * 100;

    return { performance: performance.toFixed(2), soldPrice, currentPrice };
  } catch (error) {
    console.error(`Error calculating trade performance: ${error.message}`);
    return { performance: null, soldPrice: null, currentPrice: null };
  }
};

module.exports = { getTradePerformance };
