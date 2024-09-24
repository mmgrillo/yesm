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

  const handleWalletCheck = async () => {
    console.log("Check Wallet button clicked!");
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
      console.log('Fetched Wallet Transactions:', response.data);

      if (response.data && response.data.data) {
        setWalletTransactions(response.data.data);
      } else {
        setError('No transactions found for this wallet.');
        setWalletTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
      setError('Failed to fetch wallet transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const viewDetails = (transaction) => {
    console.log('Navigating to transaction details:', transaction);
    navigate(`/transaction-details/${transaction.id}`, { state: { transaction, walletTransactions } });
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
          {walletTransactions.map((transaction, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              {/* Chain */}
              <p>
                <strong>Chain:</strong> {transaction.blockchain || 'N/A'}
              </p>
              {/* Sold Token */}
              <p>
                <strong>Sold:</strong> {transaction.attributes?.fee?.fungible_info?.symbol || 'N/A'}
              </p>
              {/* Bought Token */}
              <p>
                <strong>Bought:</strong> {transaction.attributes?.bought_token?.symbol || 'N/A'} {/* Assuming bought_token contains this data */}
              </p>
              {/* Token Value */}
              <p><strong>Token Value:</strong> {transaction.attributes?.fee?.quantity?.float || 'N/A'}</p>
              {/* Timestamp */}
              <p><strong>Timestamp:</strong> {transaction.attributes?.mined_at ? new Date(transaction.attributes.mined_at).toLocaleString() : 'N/A'}</p>
              {/* Performance */}
              {transaction.operation_type !== 'receive' && transaction.operation_type !== 'transfer' && (
                <p><strong>Performance:</strong> {/* Placeholder for performance calculation */}</p>
              )}
              <button className="mt-2 p-2 bg-[#4A0E4E] text-white rounded" onClick={() => viewDetails(transaction)}>
                Details
              </button>
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
