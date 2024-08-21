import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

const TransactionLookup = () => {
  const [txHash, setTxHash] = useState('');
  const [txInfo, setTxInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5001/api/transactions/${txHash}`);
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
          className="flex-grow p-3 border-2 rounded-l-lg border-[#4A0E4E] focus:outline-none focus:ring-2 focus:ring-[#4A0E4E]"
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
      {txInfo && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl mb-4 text-[#4A0E4E] font-semibold">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Blockchain:</strong> {txInfo.blockchain}</p>
              <p><strong>Status:</strong> {txInfo.status}</p>
              <p><strong>Amount:</strong> {txInfo.amount} {txInfo.currency}</p>
              <p><strong>Fee:</strong> {txInfo.fee} {txInfo.currency}</p>
            </div>
            <div>
              <p><strong>From:</strong> {txInfo.from}</p>
              <p><strong>To:</strong> {txInfo.to}</p>
              <p><strong>Confirmations:</strong> {txInfo.confirmations}</p>
              <p><strong>Block Number:</strong> {txInfo.blockNumber}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionLookup;