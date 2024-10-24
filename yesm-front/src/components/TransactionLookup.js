import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress') || '');
  const [walletTransactions, setWalletTransactions] = useState(JSON.parse(localStorage.getItem('walletTransactions')) || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();  // Used for navigating to the transaction details page

  // Clear stored transactions when leaving the page
  useEffect(() => {
    const storedTransactions = JSON.parse(localStorage.getItem('walletTransactions'));
    if (storedTransactions) {
      setWalletTransactions(storedTransactions);
    }
  }, []);

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
      
      // Fetch transactions processed by the backend
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}`);
      console.log('Full response data:', response.data);

      let relevantTransactions = response.data.map((tx, index) => ({
        ...tx,
        transactionNumber: index + 1,  // Add a transaction number starting from 1
      }));

      
      if (relevantTransactions.length > 200) {
        relevantTransactions = relevantTransactions.slice(0, 200);
      }

      console.log('Relevant transactions:', relevantTransactions);

      if (relevantTransactions.length > 0) {
        setWalletTransactions(relevantTransactions);
        localStorage.setItem('walletTransactions', JSON.stringify(relevantTransactions));
        localStorage.setItem('walletAddress', walletAddress);
      } else {
        setError('No relevant transactions found for this wallet.');
        setWalletTransactions([]);
        localStorage.removeItem('walletTransactions');  // Clear results if none found
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
          {walletTransactions.map((transaction) => {
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

            const soldSymbol = transfers.find(t => t.direction === 'out')?.fungible_info?.symbol?.toLowerCase() || 'unknown';
            const boughtSymbol = transfers.find(t => t.direction === 'in')?.fungible_info?.symbol?.toLowerCase() || 'unknown';

            const totalSoldUsd = transfers.find(t => t.direction === 'out')?.currentPrice || 0;
            const totalBoughtUsd = transfers.find(t => t.direction === 'in')?.currentPrice || 0;

            // Performance calculation
            const performanceSold = calculatePerformance(totalSoldUsd, totalSoldUsd);  // Same for now; adjust if you fetch current prices
            const performanceBought = calculatePerformance(totalBoughtUsd, totalBoughtUsd);

            return (
              <div key={transaction.transactionNumber} className="bg-white p-6 rounded-lg shadow-lg">
                {/* Transaction Number */}
                <p><strong>Transaction #{transaction.transactionNumber}:</strong></p>
                {/* Chain */}
                <p><strong>Chain:</strong> {chainName}</p>
                {/* Transaction Action */}
                <p><strong>Transaction Action:</strong> {attributes.operation_type || 'N/A'}</p>
                {/* Sold and Bought Tokens */}
                <p><strong>Sold:</strong> {totalSold !== 0 ? `${totalSold} ${soldSymbol?.toUpperCase()}` : 'N/A'}</p>
                <p><strong>Bought:</strong> {totalBought !== 0 ? `${totalBought} ${boughtSymbol?.toUpperCase()}` : 'N/A'}</p>
                {/* USD Value at the time of trade */}
                <p><strong>Sold (USD):</strong> ${totalSoldUsd.toFixed(2)}</p>
                <p><strong>Bought (USD):</strong> ${totalBoughtUsd.toFixed(2)}</p>
                {/* Performance */}
                <p><strong>Performance (Sold):</strong> {performanceSold !== 'N/A' ? `${performanceSold}%` : 'N/A'}</p>
                <p><strong>Performance (Bought):</strong> {performanceBought !== 'N/A' ? `${performanceBought}%` : 'N/A'}</p>
                {/* Timestamp */}
                <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>

                {/* Button to navigate to transaction details */}
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
