// src/components/TransactionLookup.js
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import TransactionDetails from './TransactionDetails';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletTransactions, setWalletTransactions] = useState([]);  // Store transactions
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to check wallet transactions
  const handleWalletCheck = async () => {
    setIsLoading(true);
    setError(null);

    if (!walletAddress) {
      setError('Please provide a valid wallet address.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}`);
      console.log('Fetched Wallet Transactions:', response.data);
      setWalletTransactions(response.data.data);  // Ensure to map correctly from backend response
    } catch (err) {
      setError('Failed to fetch wallet transactions. Please try again.');
      console.error('Error fetching wallet transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Wallet Address Lookup */}
      <div className="flex mt-10 mb-6">
        <input 
          type="text" 
          value={walletAddress} 
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter your wallet address"
          className="flex-grow p-3 rounded-l-lg bg-[#FFEBCC] border-none focus:outline-none focus:ring-2 focus:ring-[#4A0E4E] text-[#4A0E4E] placeholder-[#4A0E4E]"
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
        <TransactionDetails walletTransactions={walletTransactions} />
      ) : (
        <p className="text-red-500 mb-4">{error}</p>
      )}
    </div>
  );
};

export default TransactionLookup;
