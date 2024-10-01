import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to filter transactions based on type
  const filterSwapTransactions = (transactions) => {
    return transactions.filter((tx) => {
      const attributes = tx.attributes || {};
      const operationType = attributes.operation_type || '';

      // Check if the operation is a swap or if tokens were bought/sold
      return (operationType.includes('swap') || (attributes?.fee?.fungible_info?.symbol && attributes?.bought_token?.symbol));
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

      // Filter transactions for swaps/trades only
      const swapTransactions = filterSwapTransactions(response.data.data || []);
      
      if (swapTransactions.length > 0) {
        setWalletTransactions(swapTransactions);
      } else {
        setError('No swap or trade transactions found for this wallet.');
        setWalletTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
      setError('Failed to fetch wallet transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          {walletTransactions.map((transaction, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              {/* Chain */}
              <p><strong>Chain:</strong> {transaction.attributes?.application_metadata?.contract_address?.slice(0, 8) || 'N/A'}</p>
              {/* Transaction Action */}
              <p><strong>Transaction Action:</strong> {transaction.attributes?.operation_type || 'N/A'}</p>
              {/* Sold and Bought Tokens */}
              <p><strong>Sold:</strong> {transaction.attributes?.fee?.fungible_info?.symbol || 'N/A'}</p>
              <p><strong>Bought:</strong> {transaction.attributes?.bought_token?.symbol || 'N/A'}</p>
              {/* Token Value */}
              <p><strong>Token Value (Sold):</strong> {transaction.attributes?.fee?.quantity?.float || 'N/A'}</p>
              <p><strong>Token Value (Bought):</strong> {transaction.attributes?.bought_token?.quantity?.float || 'N/A'}</p>
              {/* Timestamp */}
              <p><strong>Timestamp:</strong> {transaction.attributes?.mined_at ? new Date(transaction.attributes.mined_at).toLocaleString() : 'N/A'}</p>
              <button className="mt-2 p-2 bg-[#4A0E4E] text-white rounded">Details</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-red-500 mb-4">{error}</p>
      )}
    </div>
  );
};

export default TransactionLookup;
