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

      // Construct the full request details for the API call
      const apiUrl = `${ZERION_API_URL}/fungibles/${address}?currency=usd`;
      const headers = {
        Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
        accept: 'application/json',
      };

      // Log the full request details for debugging
      console.log('Sending request to Zerion API with the following details:');
      console.log('URL:', apiUrl);
      console.log('Headers:', headers);

      try {
        const response = await axios.get(apiUrl, { headers });

        // Log the entire response to check its structure
        console.log(`Full response from Zerion for token ${address}:`, JSON.stringify(response.data, null, 2));

        const tokenData = response.data.data;

        // Explicitly check for the presence of market_data and log its full content
        if (tokenData && tokenData.attributes && tokenData.attributes.market_data) {
          console.log(`Full market data for token ${address}:`, JSON.stringify(tokenData.attributes.market_data, null, 2));

          // Use a more robust way to extract the price to avoid missing values
          const price = tokenData.attributes.market_data?.price || tokenData.attributes.market_data?.price?.value;

          // Store the price using both chain and address as the key
          const priceKey = `${chain}:${address}`;
          prices[priceKey] = {
            usd: price !== undefined ? price : null,
            symbol: tokenData.attributes.symbol || null,
            name: tokenData.attributes.name || null,
          };
        } else {
          console.warn(`Market data not found for token ${address}.`, tokenData);
          // Handle cases where market_data is missing
          const priceKey = `${chain}:${address}`;
          prices[priceKey] = { usd: null, symbol: tokenData?.attributes?.symbol || null, name: tokenData?.attributes?.name || null };
        }
      } catch (error) {
        console.error(`Error fetching price for ${address}:`, error.response ? error.response.data : error.message);
        
        // Store null values for failed requests
        const priceKey = `${chain}:${address}`;
        prices[priceKey] = { usd: null, symbol: null, name: null };
        
        if (error.response && error.response.status === 429) {
          console.error(`Rate limit exceeded for ${address}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    return prices;
  }
}

module.exports = ApiService;
