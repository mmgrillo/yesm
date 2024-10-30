const axios = require('axios');

const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY;

class ApiService {
  static async fetchTokenPrices(contractAddresses) {
    const prices = {};

    for (const token of contractAddresses) {
      const { chain, address, symbol } = token;

      // Updated handling for Ethereum (ETH)
      if (symbol?.toUpperCase() === 'ETH' && chain === 'ethereum') {
        try {
          const apiUrl = `${ZERION_API_URL}/fungibles/eth?currency=usd`;
          const headers = {
            Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
            accept: 'application/json',
          };
          const response = await axios.get(apiUrl, { headers });
          const price = response.data.data.attributes.market_data?.price;
          
          prices['eth'] = {
            usd: price !== undefined ? price : null,
            symbol: 'ETH',
            name: 'Ethereum',
          };
          
          console.log(`Fetched price for ETH: $${price}`);
          continue;
        } catch (error) {
          console.error('Error fetching price for ETH:', error.response ? error.response.data : error.message);
          prices['eth'] = { usd: null, symbol: 'ETH', name: 'Ethereum' };
          continue;
        }
      }

      // Skip processing if non-ETH token is missing chain or address
      if (!chain || !address) {
        console.error(`Invalid token data: chain=${chain}, address=${address}`);
        continue;
      }

      // Fetch price for non-ETH tokens
      const apiUrl = `${ZERION_API_URL}/fungibles/${address}`;
      const headers = {
        Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
        accept: 'application/json',
      };

      try {
        const response = await axios.get(apiUrl, { headers });
        console.log('API Response:', response.data);
        const price = response.data.data.attributes.market_data?.price;
        const tokenSymbol = response.data.data.attributes.symbol;
        const tokenName = response.data.data.attributes.name;
        const priceKey = `${chain}:${address}`;

        prices[priceKey] = {
          usd: price !== undefined ? price : null,
          symbol: tokenSymbol || null,
          name: tokenName || null,
        };

        console.log(`Price for token ${address} (symbol: ${tokenSymbol}): $${price}`);
      } catch (error) {
        console.error(`Error fetching price for ${address}:`, error.response ? error.response.data : error.message);
        prices[`${chain}:${address}`] = { usd: null, symbol: null, name: null };
      }
    }

    return prices;
  }
}

module.exports = ApiService;
