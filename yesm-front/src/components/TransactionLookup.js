import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTokenPrices from '../hooks/useTokenPrices';
import LoadingSpinner from './LoadingSpinner';
import TransactionCard from './TransactionCard';
import WalletBalance from './WalletBalance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddresses, setWalletAddresses] = useState(['']);
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldFetchBalance, setShouldFetchBalance] = useState(false);
  const [sortOption, setSortOption] = useState('date'); 

  const [undoTransactions, setUndoTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [adjustedBalance, setAdjustedBalance] = useState(0);

  const { tokenPrices, isLoading: isTokenPricesLoading } = useTokenPrices(API_URL, allTransactions);
  const navigate = useNavigate();

  useEffect(() => {
    if (walletAddresses.some(addr => !addr)) {
      setError("Please enter a valid wallet address.");
      return;
    }
    setError(null);
  }, [walletAddresses]);

  const fetchWalletTransactionsAndBalances = async (page = 1) => {
    setIsLoading(true);
    setIsFetchingNextPage(true);
  
    try {
      const allFetchedTransactions = [];
      for (const walletAddress of walletAddresses) {
        const response = await fetch(`${API_URL}/api/wallet/${walletAddress}?page=${page}&limit=25`);
        const data = await response.json();
        if (Array.isArray(data)) {
          // Ensure that each transaction is pushed correctly
          allFetchedTransactions.push(...data);
        } else {
          console.error("Unexpected API response format:", data);
        }
      }
      setAllTransactions(allFetchedTransactions); // Only clear previous data once new data is fetched
      setShouldFetchBalance(true);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      setError("Failed to fetch transactions");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  };
  
  
  
  const handleWalletCheck = () => {
      if (walletAddresses.some(addr => !addr)) {
        setError("Wallet addresses cannot be empty.");
        return;
      }
      setShouldFetchBalance(false);
      setError(null);
      fetchWalletTransactionsAndBalances(1);
    };

  const handleUndoChange = (transaction, isChecked) => {
    setUndoTransactions((prev) => {
      if (isChecked) {
        return [...prev, transaction];
      } else {
        return prev.filter((t) => t.transactionNumber !== transaction.transactionNumber);
      }
    });
  };

  const calculateAdjustedBalance = useCallback(() => {
    let totalAdjustment = undoTransactions.reduce((total, transaction) => {
      const soldValue = transaction.attributes.transfers
        .filter(t => t.direction === 'out')
        .reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);

      const boughtValue = transaction.attributes.transfers
        .filter(t => t.direction === 'in')
        .reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);

      const netChange = boughtValue - soldValue;
      return total + netChange;
    }, 0);

    setAdjustedBalance(currentBalance + totalAdjustment);
  }, [undoTransactions, currentBalance]);

  useEffect(() => {

    calculateAdjustedBalance();

  }, [undoTransactions, currentBalance, calculateAdjustedBalance]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchWalletTransactionsAndBalances(page);
  };

  const handleInputChange = (index, value) => {
    const updatedAddresses = [...walletAddresses];
    updatedAddresses[index] = value;
    setWalletAddresses(updatedAddresses);
  };

  const addWalletInput = () => {
    setWalletAddresses([...walletAddresses, '']);
  };

  const removeWalletInput = (index) => {
    const updatedAddresses = walletAddresses.filter((_, i) => i !== index);
    setWalletAddresses(updatedAddresses);
  };


  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  // Sorting Logic
  const sortedTransactions = [...allTransactions].sort((a, b) => {
    if (sortOption === 'rpi-high') return b.rpi - a.rpi;
    if (sortOption === 'rpi-low') return a.rpi - b.rpi;
    if (sortOption === 'date') return new Date(b.attributes.mined_at) - new Date(a.attributes.mined_at);
    return 0;
  });

  const transactionsToShow = sortedTransactions.slice((currentPage - 1) * 25, currentPage * 25);

  const renderPaginationBreadcrumb = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded ${i === currentPage ? 'bg-[#4A0E4E] text-white' : 'bg-white text-[#4A0E4E]'} transition-colors`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-2 mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded bg-white text-[#4A0E4E] hover:bg-gray-200 disabled:opacity-50"
        >
          &larr;
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded bg-white text-[#4A0E4E] hover:bg-gray-200 disabled:opacity-50"
        >
          &rarr;
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-8 rounded-lg">
      <div className="space-y-2 mb-3">
        {walletAddresses.map((address, index) => (
         <div key={index} className="flex items-center">
         <input
           type="text"
           value={address}
           onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder={`Enter wallet address ${index + 1}`}
              className="flex-1 p-3 rounded-lg bg-white border border-[#4A0E4E] text-[#4A0E4E] focus:outline-none focus:ring-2 focus:ring-[#4A0E4E]" 
            />
            {index > 0 && (
              <X
                className="ml-2 text-[#4A0E4E] cursor-pointer hover:text-red-500"
                onClick={() => removeWalletInput(index)}
              />
            )}
          </div>
     ))}
     <div className="flex justify-end mt-2">
       <span onClick={addWalletInput} className="text-sm text-[#4A0E4E] cursor-pointer hover:underline">
         Add One More Wallet
       </span>
     </div>
   </div>

    <div className="flex space-x-4 mt-4">
        <button
          onClick={handleWalletCheck}
          className="bg-[#4A0E4E] text-white px-4 py-2 rounded flex items-center hover:bg-[#6A2C6A] transition-colors"
          disabled={isLoading}
        >
          <Search className="mr-2" />
          {isLoading ? 'Checking...' : 'Check Wallets'}
        </button>
        <select
          value={sortOption}
          onChange={handleSortChange}
          className="p-2 rounded border border-[#4A0E4E] text-[#4A0E4E] bg-white"
        >
          <option value="date">Sort by Date</option>
          <option value="rpi-high">Biggest Winners (High RPI)</option>
          <option value="rpi-low">Biggest Losers (Low RPI)</option>
        </select>
      </div>

      {shouldFetchBalance && (
        <WalletBalance walletAddresses={walletAddresses} onBalanceFetched={setCurrentBalance} adjustedBalance={adjustedBalance} />
      )}

      {isLoading || isTokenPricesLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          {transactionsToShow.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg">
              {transactionsToShow.map((transaction, index) => (
                <TransactionCard
                  key={`${transaction.transactionNumber}-${index}`}
                  transaction={transaction}
                  tokenPrices={tokenPrices}
                  navigate={navigate}
                  onUndoChange={handleUndoChange}
                />
              ))}
            </div>
          )}

          {renderPaginationBreadcrumb()}

          {isFetchingNextPage && <LoadingSpinner />}
        </>
      )}
    </div>
  );
};

export default TransactionLookup;
