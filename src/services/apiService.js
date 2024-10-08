const axios = require('axios');

// Zerion API configuration
const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY; // Fetch from .env file

class ApiService {
  // Fetch transactions from Zerion API
  static async fetchTransactions(walletAddress) {
    try {
      const response = await axios.get(`${ZERION_API_URL}/wallets/${walletAddress}/transactions?filter[operation_types]=trade`, {
        headers: {
          Authorization: `Bearer ${ZERION_API_KEY}`, 
        },
      });

      const transactions = response.data.data.filter((tx) => {
        const contractAddress = tx.attributes?.application_metadata?.contract_address?.toLowerCase();
        const operationType = tx.attributes?.operation_type?.toLowerCase();
        return operationType === 'trade';  // Simplified for trades only
      });

      return transactions;
    } catch (error) {
      throw new Error('Failed to fetch transactions from Zerion: ' + error.message);
    }
  }

  // Fetch current token prices from Zerion API using contract addresses
  static async fetchTokenPrices(contractAddresses) {
    const prices = {};
  
    for (const address of contractAddresses) {
      try {
        const response = await axios.get(`${ZERION_API_URL}/fungibles/${address}`, {
          params: { currency: 'usd' },
          headers: {
            Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
          },
        });
  
        const token = response.data.data;
        const price = token.attributes.market_data?.price?.value;
        prices[address.toLowerCase()] = {
          usd: price !== undefined ? price : null,
          symbol: token.attributes.symbol,
          name: token.attributes.name,
        };
      } catch (error) {
        // Better error handling for different error types (rate-limiting, server errors)
        if (error.response && error.response.status === 429) {
          console.error(`Rate limit exceeded for ${address}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
          // Retry logic could go here if desired
        } else {
          console.error(`Error fetching price for ${address}:`, error.response ? error.response.data : error.message);
        }
        prices[address.toLowerCase()] = { usd: null, symbol: null, name: null };
      }
    }
  
    return prices;
  }
}
module.exports = ApiService;
