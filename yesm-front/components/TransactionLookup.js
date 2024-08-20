import React, { useState } from 'react';
import { Search } from 'lucide-react';
import TransactionDetails from './TransactionDetails';
import axios from 'axios'; // Don't forget to install axios: npm install axios

const TransactionLookup = () => {
  const [txHash, setTxHash] = useState('');
  const [txInfo, setTxInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5001/api/v1/transactions/${txHash}`);
      setTxInfo(response.data);
    } catch (err) {
      setError('Failed to fetch transaction details. Please try again.');
      console.error('Error fetching transaction details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex mb-4">
        <input 
          type="text" 
          value={txHash} 
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste your transaction hash here"
          className="flex-grow p-2 border rounded-l-lg border-[#4A0E4E]"
        />
        <button 
          onClick={handleCheck}
          className="bg-[#4A0E4E] text-white p-2 rounded-r-lg flex items-center hover:bg-[#6A2C6A] transition-colors"
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