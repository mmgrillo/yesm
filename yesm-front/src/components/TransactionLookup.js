import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTokenPrices from '../hooks/useTokenPrices';
import LoadingSpinner from './LoadingSpinner';
import TransactionCard from './TransactionCard';
import WalletBalance from './WalletBalance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const TRANSACTIONS_PER_PAGE = 20;

const TransactionLookup = () => {
  const [walletAddresses, setWalletAddresses] = useState(['']);
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);
  const [ isfetchingnextpage, setIsFetchingNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldFetchBalance, setShouldFetchBalance] = useState(false);
  const [sortOption, setSortOption] = useState('date'); 
  const [hasSearched, setHasSearched] = useState(false);

  const [undoTransactions, setUndoTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [adjustedBalance, setAdjustedBalance] = useState(0);

  const { tokenPrices, isLoading: isTokenPricesLoading } = useTokenPrices(API_URL, allTransactions);
  const navigate = useNavigate();

  const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);


  const fetchWalletTransactionsAndBalances = async () => {
    setIsLoading(true);
    setIsFetchingNextPage(true);
  
    try {
      const allFetchedTransactions = [];
      for (const walletAddress of walletAddresses) {
        const response = await fetch(`${API_URL}/api/wallet/${walletAddress}?limit=${TRANSACTIONS_PER_PAGE}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          allFetchedTransactions.push(...data);
        }
      }
      setAllTransactions(allFetchedTransactions);
      setShouldFetchBalance(true);
      setHasSearched(true);
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
    if (!hasSearched || totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-lg ${
            i === currentPage 
              ? 'bg-[#4A0E4E] text-white shadow-lg' 
              : 'bg-white text-[#4A0E4E] hover:bg-[#FFE4B5] transition-colors'
          } font-medium`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-3 mt-6">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-3 rounded-lg bg-white text-[#4A0E4E] hover:bg-[#FFE4B5] transition-colors disabled:opacity-50 disabled:hover:bg-white"
        >
          &larr;
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-3 rounded-lg bg-white text-[#4A0E4E] hover:bg-[#FFE4B5] transition-colors disabled:opacity-50 disabled:hover:bg-white"
        >
          &rarr;
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-8 rounded-lg">
      <div className={`space-y-4 ${!hasSearched ? 'max-w-xl mx-auto' : ''}`}>
        {walletAddresses.map((address, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={address}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder={`Enter wallet address ${index + 1}`}
              className="flex-1 p-4 rounded-lg bg-white border-2 border-[#4A0E4E] text-[#4A0E4E] focus:outline-none focus:ring-2 focus:ring-[#4A0E4E] text-lg placeholder-gray-400"
            />
            {index > 0 && (
              <button
                onClick={() => removeWalletInput(index)}
                className="p-4 rounded-lg bg-white text-[#4A0E4E] hover:bg-red-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <button
            onClick={addWalletInput}
            className="text-[#4A0E4E] hover:text-purple-800 font-medium transition-colors"
          >
            Add One More Wallet
          </button>
        </div>

        <div className={`flex ${hasSearched ? 'space-x-4' : 'flex-col space-y-4'} mt-6`}>
          <button
            onClick={handleWalletCheck}
            disabled={isLoading}
            className={`
              bg-[#4A0E4E] text-white rounded-lg flex items-center justify-center
              hover:bg-[#6A2C6A] transition-all transform hover:scale-105
              ${hasSearched ? 'px-6 py-3' : 'px-8 py-4 text-xl w-full'}
            `}
          >
            <Search className={`${hasSearched ? 'w-5 h-5 mr-2' : 'w-6 h-6 mr-3'}`} />
            {isLoading ? 'Checking...' : 'Check Wallets'}
          </button>

          {hasSearched && (
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="px-4 py-3 rounded-lg border-2 border-[#4A0E4E] text-[#4A0E4E] bg-white hover:bg-[#FFE4B5] transition-colors cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="rpi-high">Biggest Winners (High RPI)</option>
              <option value="rpi-low">Biggest Losers (Low RPI)</option>
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {shouldFetchBalance && (
        <WalletBalance
          walletAddresses={walletAddresses}
          onBalanceFetched={setCurrentBalance}
          adjustedBalance={adjustedBalance}
        />
      )}

      {(isLoading || isTokenPricesLoading) ? (
        <LoadingSpinner />
      ) : (
        hasSearched && allTransactions.length > 0 && (
          <>
            <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg mt-6">
              {allTransactions
                .slice((currentPage - 1) * TRANSACTIONS_PER_PAGE, currentPage * TRANSACTIONS_PER_PAGE)
                .map((transaction, index) => (
                  <TransactionCard
                    key={`${transaction.transactionNumber}-${index}`}
                    transaction={transaction}
                    tokenPrices={tokenPrices}
                    navigate={navigate}
                    onUndoChange={handleUndoChange}
                  />
                ))}
            </div>
            {renderPaginationBreadcrumb()}
          </>
        )
      )}
    </div>
  );
};

export default TransactionLookup;