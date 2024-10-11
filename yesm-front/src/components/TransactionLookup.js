import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenPrices, setTokenPrices] = useState({});

  // Updated function to extract contract addresses with chain information
  const extractContractAddressesAndChains = (transactions) => {
    const contractAddresses = new Set();
    const chainData = new Set();
  
    transactions.forEach((transaction) => {
      const chainId = transaction.relationships?.chain?.data?.id;
      if (transaction.attributes?.transfers && Array.isArray(transaction.attributes.transfers)) {
        transaction.attributes.transfers.forEach((transfer) => {
          if (transfer.fungible_info?.implementations && transfer.fungible_info.implementations.length > 0) {
            // Find the implementation that matches the transaction's chain ID
            const correctImplementation = transfer.fungible_info.implementations.find(
              (impl) => impl.chain_id.toLowerCase() === chainId.toLowerCase()
            );
            
            // If a matching implementation is found, use its address
            if (correctImplementation) {
              contractAddresses.add(correctImplementation.address.toLowerCase());
              chainData.add(chainId.toLowerCase());
            }
          }
        });
      }
    });
  
    return { addresses: Array.from(contractAddresses), chains: Array.from(chainData) };
  };

  // Function to filter transactions based on type
  const filterRelevantTransactions = (transactions) => {
    return transactions.filter((tx) => {
      const attributes = tx.attributes || {};
      const operationType = attributes.operation_type || '';
      return ['trade'].includes(operationType.toLowerCase());
    });
  };

  // Updated function to check wallet transactions
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
      const relevantTransactions = filterRelevantTransactions(unfilteredTransactions || []);
      console.log('Relevant transactions:', relevantTransactions);
  
      if (relevantTransactions.length > 0) {
        setWalletTransactions(relevantTransactions);
  
        // Extract contract addresses with chain information from the transactions
        const { addresses, chains } = extractContractAddressesAndChains(relevantTransactions);
  
        // Fetch current prices for valid addresses
        if (addresses.length > 0 && chains.length > 0) {
          const prices = await axios.get(`${API_URL}/api/token-prices`, {
            params: { addresses: addresses.join(','), chains: chains.join(',') },
          });
          setTokenPrices(prices.data);
          console.log('Token prices:', prices.data);
        } else {
          console.warn('No valid token addresses or chain data found.');
        }
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

            const soldContractAddress = transfers.find(t => t.direction === 'out')?.fungible_info?.implementations?.[0]?.address?.toLowerCase() || 'unknown';
            const boughtContractAddress = transfers.find(t => t.direction === 'in')?.fungible_info?.implementations?.[0]?.address?.toLowerCase() || 'unknown';
            const soldPriceThen = transfers.find(t => t.direction === 'out')?.price || 0;
            const boughtPriceThen = transfers.find(t => t.direction === 'in')?.price || 0;

            // Fetch the current prices from the dynamically fetched data using contract addresses
            const currentSoldPrice = tokenPrices[`${chainName}:${soldContractAddress}`]?.usd || 0;
            const currentBoughtPrice = tokenPrices[`${chainName}:${boughtContractAddress}`]?.usd || 0;

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
