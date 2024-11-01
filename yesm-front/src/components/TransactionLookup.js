import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTokenPrices from '../hooks/useTokenPrices';
import LoadingSpinner from './LoadingSpinner';
import TransactionCard from './TransactionCard';
import WalletBalance from './WalletBalance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddresses, setWalletAddresses] = useState(['']); // Initialize with one input box
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldFetchBalance, setShouldFetchBalance] = useState(false);

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
    setAllTransactions([]); // Clear previous transactions
    try {
      const allFetchedTransactions = [];
      for (const walletAddress of walletAddresses) {
        const response = await fetch(`${API_URL}/api/wallet/${walletAddress}?page=${page}&limit=25`);
        const data = await response.json();
        if (data) {
          allFetchedTransactions.push(...data);
        }
      }
      setAllTransactions(allFetchedTransactions);
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadNextPageInBackground(page);
  };

  const loadNextPageInBackground = (nextPage) => {
    fetchWalletTransactionsAndBalances(nextPage);
  };

  const handleInputChange = (index, value) => {
    const updatedAddresses = [...walletAddresses];
    updatedAddresses[index] = value;
    setWalletAddresses(updatedAddresses);
  };

  const addWalletInput = () => {
    setWalletAddresses([...walletAddresses, '']);
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
      <div className="space-y-4 mb-3">
        {walletAddresses.map((address, index) => (
          <input
            key={index}
            type="text"
            value={address}
            onChange={(e) => handleInputChange(index, e.target.value)}
            placeholder={`Enter wallet address ${index + 1}`}
            className="w-full p-3 rounded-lg bg-white border border-[#4A0E4E] text-[#4A0E4E] focus:outline-none focus:ring-2 focus:ring-[#4A0E4E]"
          />
        ))}
        <button
          onClick={addWalletInput}
          className="bg-[#4A0E4E] text-white px-4 py-2 rounded hover:bg-[#6A2C6A] transition-colors"
        >
          Add One More Wallet
        </button>
      </div>

      <div className="flex mt-5">
        <button
          onClick={handleWalletCheck}
          className="bg-[#4A0E4E] text-white px-4 py-2 rounded flex items-center hover:bg-[#6A2C6A] transition-colors"
          disabled={isLoading}
        >
          <Search className="mr-2" />
          {isLoading ? 'Checking...' : 'Check Wallets'}
        </button>
      </div>

      {shouldFetchBalance && (
        <WalletBalance walletAddresses={walletAddresses} />
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
