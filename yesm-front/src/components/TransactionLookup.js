import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Function to dynamically fetch prices from CoinGecko using contract addresses
const getCurrentTokenPricesByContract = async (contractAddresses) => {
  const contractList = contractAddresses.join(',');
  const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${contractList}&vs_currencies=usd`);
  return response.data;  // Returns current prices for tokens by contract address
};

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenPrices, setTokenPrices] = useState({});

  // Function to extract unique contract addresses from transactions
  const extractContractAddresses = (transactions) => {
    const contractAddresses = new Set();
    transactions.forEach((transaction) => {
      if (transaction.attributes?.transfers && Array.isArray(transaction.attributes.transfers)) {
        transaction.attributes.transfers.forEach((transfer) => {
          if (transfer.fungible_info?.implementations && transfer.fungible_info.implementations.length > 0) {
            // Get the contract address from the first implementation (assuming it's on Ethereum)
            const contractAddress = transfer.fungible_info.implementations[0].address;
            contractAddresses.add(contractAddress.toLowerCase());
          }
        });
      }
    });
    return Array.from(contractAddresses);  // Return unique contract addresses as an array
  };

  // Function to extract symbols from transfers
  const extractTokenSymbols = (transactions) => {
    const tokenSymbols = new Set();
    transactions.forEach((transaction) => {
      if (transaction.attributes?.transfers && Array.isArray(transaction.attributes.transfers)) {
        transaction.attributes.transfers.forEach((transfer) => {
          if (transfer.fungible_info?.symbol) {
            tokenSymbols.add(transfer.fungible_info.symbol.toLowerCase());
          }
        });
      }
    });
    return Array.from(tokenSymbols);  // Return unique token symbols as an array
  };

  // Function to filter transactions based on type
  const filterRelevantTransactions = (transactions) => {
    return transactions.filter((tx) => {
      const attributes = tx.attributes || {};
      const operationType = attributes.operation_type || '';
      return ['trade'].includes(operationType.toLowerCase());
    });
  };

  // Function to check wallet transactions
  const handleWalletCheck = async () => {
    setIsLoading(true);
    setError(null);

    if (!walletAddress || walletAddress.length < 10) {
      setError('Please provide a valid wallet address.');
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Fetching transactions for wallet: ${walletAddress}`);
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}`);
      console.log('Full response data:', response.data);

      const unfilteredTransactions = response.data.data || response.data;
      console.log('Unfiltered transactions:', unfilteredTransactions);

      const relevantTransactions = filterRelevantTransactions(unfilteredTransactions || []);
      console.log('Relevant transactions:', relevantTransactions);

      if (relevantTransactions.length > 0) {
        setWalletTransactions(relevantTransactions);

        // Extract contract addresses and fetch their current prices
        const contractAddresses = extractContractAddresses(relevantTransactions);
        const prices = await getCurrentTokenPricesByContract(contractAddresses);
        setTokenPrices(prices);
        console.log('Token prices by contract address:', prices);
      } else {
        setError('No relevant transactions found for this wallet.');
        setWalletTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
      setError('Failed to fetch wallet transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to calculate performance (appreciation or depreciation)
  const calculatePerformance = (initialValue, currentValue) => {
    if (initialValue === 0 || currentValue === 0 || isNaN(initialValue) || isNaN(currentValue)) {
      return 'N/A';
    }
    return (((currentValue - initialValue) / initialValue) * 100).toFixed(2);  // Percentage
  };

  // Log the state of walletTransactions and error
  useEffect(() => {
    console.log('Wallet transactions:', walletTransactions);
    console.log('Error message:', error);
  }, [walletTransactions, error]);

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-8 rounded-lg">
      {/* Wallet Address Input */}
      <div className="flex mt-5 mb-3">
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter your wallet address"
          className="flex-grow p-3 rounded-l-lg bg-white border border-[#4A0E4E] text-[#4A0E4E] focus:outline-none focus:ring-2 focus:ring-[#4A0E4E]"
        />
        <button
          onClick={handleWalletCheck}
          className="bg-[#4A0E4E] text-white p-3 rounded-r-lg flex items-center hover:bg-[#6A2C6A] transition-colors"
          disabled={isLoading}
        >
          <Search className="mr-2" />
          {isLoading ? 'Checking...' : 'Check Wallet'}
        </button>
      </div>

      {/* Display Wallet Transactions */}
      {walletTransactions.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg">
          {walletTransactions.map((transaction, index) => {
            const chainName = transaction.relationships?.chain?.data?.id || 'N/A';
            const attributes = transaction.attributes || {};
            const transfers = attributes.transfers || [];

            // Summing all 'out' transfers for sold values
            const totalSold = transfers
              .filter(transfer => transfer.direction === 'out')
              .reduce((sum, transfer) => sum + (transfer.quantity?.float || transfer.value || 0), 0);

            // Summing all 'in' transfers for bought values
            const totalBought = transfers
              .filter(transfer => transfer.direction === 'in')
              .reduce((sum, transfer) => sum + (transfer.quantity?.float || transfer.value || 0), 0);

            // Extract symbols to show on frontend
            const soldSymbol = transfers.find(t => t.direction === 'out')?.fungible_info?.symbol?.toLowerCase() || 'unknown';
            const boughtSymbol = transfers.find(t => t.direction === 'in')?.fungible_info?.symbol?.toLowerCase() || 'unknown';

            // Prices from the CoinGecko API using contract addresses (fetched in the background)
            const soldContractAddress = transfers.find(t => t.direction === 'out')?.fungible_info?.implementations?.[0]?.address?.toLowerCase() || 'unknown';
            const boughtContractAddress = transfers.find(t => t.direction === 'in')?.fungible_info?.implementations?.[0]?.address?.toLowerCase() || 'unknown';
            const soldPriceThen = transfers.find(t => t.direction === 'out')?.price || 0;
            const boughtPriceThen = transfers.find(t => t.direction === 'in')?.price || 0;

            // Fetch the current prices from the dynamically fetched data using contract addresses
            const currentSoldPrice = tokenPrices[soldContractAddress]?.usd || soldPriceThen || 0;
            const currentBoughtPrice = tokenPrices[boughtContractAddress]?.usd || boughtPriceThen || 0;

            // USD Value calculations
            const totalSoldUsdThen = (totalSold * soldPriceThen).toFixed(2);
            const totalBoughtUsdThen = (totalBought * boughtPriceThen).toFixed(2);
            const currentSoldUsd = (totalSold * currentSoldPrice).toFixed(2);
            const currentBoughtUsd = (totalBought * currentBoughtPrice).toFixed(2);

            // Performance calculation
            const performanceSold = calculatePerformance(parseFloat(totalSoldUsdThen), parseFloat(currentSoldUsd));
            const performanceBought = calculatePerformance(parseFloat(totalBoughtUsdThen), parseFloat(currentBoughtUsd));

            return (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                {/* Chain */}
                <p><strong>Chain:</strong> {chainName}</p>
                {/* Transaction Action */}
                <p><strong>Transaction Action:</strong> {attributes.operation_type || 'N/A'}</p>
                {/* Sold and Bought Tokens */}
                <p><strong>Sold:</strong> {totalSold !== 0 ? `${totalSold} ${soldSymbol?.toUpperCase()}` : 'N/A'}</p>
                <p><strong>Bought:</strong> {totalBought !== 0 ? `${totalBought} ${boughtSymbol?.toUpperCase()}` : 'N/A'}</p>
                {/* USD Value at the time of trade */}
                <p><strong>Sold (USD at time of trade):</strong> {totalSoldUsdThen !== '0.00' ? `$${totalSoldUsdThen}` : 'N/A'}</p>
                <p><strong>Bought (USD at time of trade):</strong> {totalBoughtUsdThen !== '0.00' ? `$${totalBoughtUsdThen}` : 'N/A'}</p>
                {/* Current USD Value */}
                <p><strong>Sold (Current USD):</strong> ${currentSoldUsd}</p>
                <p><strong>Bought (Current USD):</strong> ${currentBoughtUsd}</p>
                {/* Performance */}
                <p><strong>Performance (Sold):</strong> {performanceSold !== 'N/A' ? `${performanceSold}%` : 'N/A'}</p>
                <p><strong>Performance (Bought):</strong> {performanceBought !== 'N/A' ? `${performanceBought}%` : 'N/A'}</p>
                {/* Timestamp */}
                <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>
                <button className="mt-2 p-2 bg-[#4A0E4E] text-white rounded">Details</button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-red-500 mb-4">{error}</p>
      )}
    </div>
  );
};

export default TransactionLookup;
