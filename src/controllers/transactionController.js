const axios = require('axios');
const ApiService = require('../services/apiService');

const extractContractAddressesAndChains = (transactions) => {
  const addresses = [];
  const chains = [];

  transactions.forEach((tx) => {
    tx.attributes.transfers.forEach((transfer) => {
      const implementations = transfer.fungible_info?.implementations || [];

      // Special case for ETH - no contract address needed
      if (transfer.fungible_info.symbol.toLowerCase() === 'eth') {
        addresses.push('eth');  // Use 'eth' as the identifier for Ethereum
        chains.push('ethereum');
      } else {
        let chosenImplementation = implementations.find(impl => impl.chain_id === 'ethereum') ||
                                   implementations.find(impl => impl.chain_id === 'binance') ||
                                   implementations.find(impl => impl.address);

        if (chosenImplementation && chosenImplementation.address) {
          addresses.push(chosenImplementation.address);
          chains.push(chosenImplementation.chain_id || 'eth');  // Default to 'eth' if no chain_id
        }
      }
    });
  });

  return { addresses, chains };
};

exports.getWalletTransactions = async (req, res) => {
  const { walletAddress } = req.params;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions?filter[operation_types]=trade`;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const response = await axios.get(ZERION_API_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    const transactions = response.data.data;
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: 'No relevant transactions found.' });
    }

    // Extract contract addresses and chains
    const { addresses, chains } = extractContractAddressesAndChains(transactions);

    // Fetch token prices using ApiService
    const prices = await ApiService.fetchTokenPrices(
      addresses.map((address, index) => ({ chain: chains[index], address }))
    );

    // Add prices back to transactions
    const transactionsWithPrices = transactions.map(tx => {
      const transfers = tx.attributes.transfers.map(transfer => {
        const address = transfer.fungible_info?.implementations[0]?.address?.toLowerCase() || 'eth';
        const priceData = prices[`${transfer.fungible_info.symbol.toLowerCase()}:${address}`] || { usd: null };
        return { ...transfer, currentPrice: priceData.usd };
      });
    
      return { ...tx, attributes: { ...tx.attributes, transfers } };
    });
    console.log('Transactions with current prices:', transactionsWithPrices);
    
    // Fetch wallet balance and tokens
    const { balance, tokens } = await ApiService.fetchWalletBalance(walletAddress);

    res.json({ transactions: transactionsWithPrices, balance, tokens });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to fetch wallet transactions.' });
  }
};
