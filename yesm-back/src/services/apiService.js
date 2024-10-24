const axios = require('axios');

const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY;

class ApiService {
  static async fetchTokenPrices(tokens) {
    const prices = {};

    for (const token of tokens) {
      const { chain, address } = token;

      if (!chain || !address) {
        console.error(`Invalid token data: chain=${chain}, address=${address}`);
        continue;
      }

      const apiUrl = `${ZERION_API_URL}/fungibles/${address}?currency=usd`;
      const headers = {
        Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
        accept: 'application/json',
      };

      try {
        const response = await axios.get(apiUrl, { headers });
        const tokenData = response.data.data;
        const price = tokenData.attributes?.market_data?.price || null;
        const priceKey = `${chain}:${address}`;
        prices[priceKey] = { usd: price, symbol: tokenData.attributes?.symbol, name: tokenData.attributes?.name };
      } catch (error) {
        console.error(`Error fetching price for ${address}:`, error.response ? error.response.data : error.message);
        // Handle the case when the token is not found
        prices[`${chain}:${address}`] = { usd: null, symbol: null, name: null };
      }
    }

    return prices;
  }
}

module.exports = ApiService;
