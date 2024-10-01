const axios = require('axios');

const API_URL = 'https://api.zerion.io/v1';
const API_KEY = process.env.ZERION_API_KEY; // Fetch from .env file

class ApiService {
  static async fetchTransactions(walletAddress) {
    try {
      const response = await axios.get(`${API_URL}/wallets/${walletAddress}/transactions`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`, // Using Bearer token for Zerion API
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch transactions from Zerion: ' + error.message);
    }
  }
}

module.exports = ApiService;
