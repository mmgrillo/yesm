const axios = require('axios');

const API_URL = 'https://api.zerion.io/v1';
const API_KEY = process.env.ZERION_API_KEY; // Fetch from .env file

// List of known DEX contract addresses (Uniswap, SushiSwap, etc.)
const dexContractAddresses = [
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',   
  '0xSushiSwapAddress', 
  
];

// List of known CEX contract addresses (Binance, Coinbase, etc.)
const cexContractAddresses = [
  '0xBinanceAddress',   // Replace with actual Binance contract address
  '0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511', 
  '0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511', 
  // Add more known CEX addresses as needed
];

class ApiService {
  static async fetchTransactions(walletAddress) {
    try {
      const response = await axios.get(`${API_URL}/wallets/${walletAddress}/transactions?filter[operation_types]=trade,send,receive,deposit,withdraw`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`, // Using Bearer token for Zerion API
        },
      });

      // Filter trades by checking if the contract address belongs to a known DEX or CEX
      const transactions = response.data.data.filter((tx) => {
        const contractAddress = tx.attributes?.application_metadata?.contract_address?.toLowerCase();
        const operationType = tx.attributes?.operation_type?.toLowerCase();

          // Log operation types to debug
      const transactions = response.data.data;
      transactions.forEach((tx) => {
        console.log(`Operation type: ${tx.attributes.operation_type}`);
      });

        // Check if the transaction is a trade and belongs to a known DEX or CEX
        const isDexTrade = dexContractAddresses.includes(contractAddress);
        const isCexTrade = cexContractAddresses.includes(contractAddress);

        return operationType === 'trade' && (isDexTrade || isCexTrade);
      });

      return transactions;
    } catch (error) {
      throw new Error('Failed to fetch transactions from Zerion: ' + error.message);
    }
  }
}

module.exports = ApiService;
