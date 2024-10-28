import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress') || '');
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [tokenPrices, setTokenPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      
      // Fetch transactions from the backend
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}`);

       // Log all transactions returned by the API in the browser console
      console.log('%c Transactions returned by API:', 'color: green; font-weight: bold;');
      console.table(response.data);
      
      // Map and add a transaction number to each transaction
      const relevantTransactions = response.data.map((tx, index) => ({
        ...tx,
        transactionNumber: index + 1,
      }));
  
      // Update state with the relevant transactions
      setWalletTransactions(relevantTransactions);
      localStorage.setItem('walletTransactions', JSON.stringify(relevantTransactions));
      localStorage.setItem('walletAddress', walletAddress);
  
      // Fetch prices for all tokens involved in these transactions
      await fetchAllTokenPrices(relevantTransactions);
      
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
      setError('Failed to fetch wallet transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch all token prices based on the transactions
  const fetchAllTokenPrices = async (transactions) => {
    const tokens = transactions.flatMap(transaction => {
      const transfers = transaction.attributes?.transfers || [];
      const soldToken = transfers.find(t => t.direction === 'out')?.fungible_info;
      const boughtToken = transfers.find(t => t.direction === 'in')?.fungible_info;

      // Helper function to get a supported implementation, prioritizing Ethereum
      const getSupportedImplementation = (token) => {
        // Prioritize Ethereum if available
        const ethImplementation = token.implementations.find(impl => impl.chain_id === 'ethereum');
        // Fallback to the first available implementation if Ethereum is not available
        return ethImplementation || token.implementations[0];
      };

      return [
        soldToken ? {
          chain: getSupportedImplementation(soldToken)?.chain_id,
          address: getSupportedImplementation(soldToken)?.address,
          symbol: soldToken.symbol
        } : null,
        boughtToken ? {
          chain: getSupportedImplementation(boughtToken)?.chain_id,
          address: getSupportedImplementation(boughtToken)?.address,
          symbol: boughtToken.symbol
        } : null
      ].filter(token => token); // Filter out any null values
    });

    // Ensure only unique tokens are fetched
    const uniqueTokensToFetch = tokens.filter(token =>
      !tokenPrices[`${token.chain}:${token.address || token.symbol}`]
    );

    if (uniqueTokensToFetch.length === 0) return; // No tokens to fetch

    try {
      const response = await axios.post(`${API_URL}/api/token-prices`, { tokens: uniqueTokensToFetch });
      setTokenPrices(prevPrices => ({ ...prevPrices, ...response.data })); // Store fetched prices in state
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-8 rounded-lg">
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

      {walletTransactions.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg">
          {walletTransactions.map((transaction) => {
            const attributes = transaction.attributes || {};
            const transfers = attributes.transfers || [];

            // Extract sold and bought values, symbols, and addresses from the transfers array
            const soldTransfer = transfers.find(t => t.direction === 'out');
            const boughtTransfer = transfers.find(t => t.direction === 'in');

            const soldValueInUsd = soldTransfer?.value || 0;
            const soldPriceThen = soldTransfer?.price || 0;
            const soldQuantity = soldTransfer?.quantity?.float || 0;
            const soldSymbol = soldTransfer?.fungible_info?.symbol?.toUpperCase() || 'N/A';
            const soldAddress = soldTransfer?.fungible_info?.implementations[0]?.address || '';

            const boughtValueInUsd = boughtTransfer?.value || 0;
            const boughtPriceThen = boughtTransfer?.price || 0;
            const boughtQuantity = boughtTransfer?.quantity?.float || 0;
            const boughtSymbol = boughtTransfer?.fungible_info?.symbol?.toUpperCase() || 'N/A';
            const boughtAddress = boughtTransfer?.fungible_info?.implementations[0]?.address || '';

            // Get current prices for the sold and bought tokens from state
            const currentSoldPrice = tokenPrices[`eth:${soldAddress.toLowerCase()}`]?.usd || 0;
            const currentBoughtPrice = tokenPrices[`eth:${boughtAddress.toLowerCase()}`]?.usd || 0;

            // Calculate performance based on initial sold price and current price
            const soldPerformance = soldPriceThen !== 0
              ? ((currentSoldPrice - soldPriceThen) / soldPriceThen) * 100
              : 'N/A';

            const boughtPerformance = boughtPriceThen !== 0
              ? ((currentBoughtPrice - boughtPriceThen) / boughtPriceThen) * 100
              : 'N/A';

            // Calculate the combined performance as an average of both performances
            const performance = (soldPerformance !== 'N/A' && boughtPerformance !== 'N/A')
              ? ((soldPerformance + boughtPerformance) / 2).toFixed(2)
              : 'N/A';

            return (
              <div key={transaction.transactionNumber} className="bg-white p-6 rounded-lg shadow-lg">
                <p><strong>Transaction #{transaction.transactionNumber}:</strong></p>
                <p><strong>Transaction Action:</strong> {attributes.operation_type || 'N/A'}</p>
                <p><strong>Sold:</strong> {soldQuantity !== 0 ? `${soldQuantity} ${soldSymbol}` : 'N/A'}</p>
                <p><strong>Sold (USD at time of trade):</strong> {soldValueInUsd !== 0 ? `$${soldValueInUsd.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Sold Price per Unit (USD):</strong> {soldPriceThen !== 0 ? `$${soldPriceThen.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Bought:</strong> {boughtQuantity !== 0 ? `${boughtQuantity} ${boughtSymbol}` : 'N/A'}</p>
                <p><strong>Bought (USD at time of trade):</strong> {boughtValueInUsd !== 0 ? `$${boughtValueInUsd.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Bought Price per Unit (USD):</strong> {boughtPriceThen !== 0 ? `$${boughtPriceThen.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Current Sold Price (USD):</strong> {currentSoldPrice !== 0 ? `$${currentSoldPrice.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Current Bought Price (USD):</strong> {currentBoughtPrice !== 0 ? `$${currentBoughtPrice.toFixed(2)}` : 'N/A'}</p>
                <p><strong>Performance:</strong> {performance !== 'N/A' ? `${performance}%` : 'N/A'}</p>
                <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>

                <button
                  className="mt-2 p-2 bg-[#4A0E4E] text-white rounded"
                  onClick={() => navigate(`/transaction-details/${transaction.transactionNumber}`, { state: { transaction, prevPage: 'searchResults' } })}
                >
                  View Details
                </button>
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
