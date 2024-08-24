import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import TransactionDetails from './TransactionDetails';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [txHash, setTxHash] = useState('');
  const [txInfo, setTxInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/transactions/${txHash}`);
      console.log('Fetched Transaction Details:', response.data);
      setTxInfo(response.data);
    } catch (err) {
      setError('Failed to fetch transaction details. Please try again.');
      console.error('Error fetching transaction details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex mb-6">
        <input 
          type="text" 
          value={txHash} 
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste your transaction hash here"
          className="flex-grow p-3 rounded-l-lg bg-[#FFEBCC] border-none focus:outline-none focus:ring-2 focus:ring-[#4A0E4E] text-[#4A0E4E] placeholder-[#4A0E4E]"
        />
        <button 
          onClick={handleCheck}
          className="bg-[#4A0E4E] text-white p-3 rounded-r-lg flex items-center hover:bg-[#6A2C6A] transition-colors"
          disabled={isLoading}
        >
          <Search className="mr-2" />
          {isLoading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {txInfo && <TransactionDetails txInfo={txInfo} />}
    </div>
  );
};

export default TransactionLookup;