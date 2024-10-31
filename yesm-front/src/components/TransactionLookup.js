import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTokenPrices from '../hooks/useTokenPrices';
import LoadingSpinner from './LoadingSpinner';
import TransactionCard from './TransactionCard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { tokenPrices, isLoading: isTokenPricesLoading } = useTokenPrices(API_URL, allTransactions);
  const navigate = useNavigate();

  const fetchWalletTransactionsPaginated = async (walletAddress, page = 1) => {
    setIsFetchingNextPage(true);
    try {
      const response = await fetch(`${API_URL}/api/wallet/${walletAddress}?page=${page}&limit=25`);
      const data = await response.json();
      if (page === 1) {
        setAllTransactions(data || []);
      } else {
        setAllTransactions((prev) => [...prev, ...(data || [])]);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      setError("Failed to fetch transactions");
    } finally {
      setIsFetchingNextPage(false);
    }
  };

  const loadNextPageInBackground = (nextPage) => {
    fetchWalletTransactionsPaginated(walletAddress, nextPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadNextPageInBackground(page + 1);
  };

  const handleWalletCheck = () => {
    fetchWalletTransactionsPaginated(walletAddress, 1);
    localStorage.setItem('walletAddress', walletAddress);
  };

  const transactionsToShow = Array.isArray(allTransactions) 
    ? allTransactions.slice((currentPage - 1) * 25, currentPage * 25) 
    : [];

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

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          {transactionsToShow.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg">
              {transactionsToShow.map((transaction, index) => (
                <TransactionCard
                  key={`${transaction.transactionNumber}-${index}`}
                  transaction={transaction}
                  tokenPrices={tokenPrices}
                  navigate={navigate}
                />
              ))}
            </div>
          ) : (
            !error && <p className="text-red-500 mb-4">No transactions available.</p>
          )}

          {renderPaginationBreadcrumb()}

          {isFetchingNextPage && <LoadingSpinner />}
        </>
      )}
    </div>
  );
};

export default TransactionLookup;
