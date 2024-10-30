import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useWalletData from '../hooks/useWalletData';
import useTokenPrices from '../hooks/useTokenPrices';
import LoadingSpinner from './LoadingSpinner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TransactionLookup = () => {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress') || '');
  const { walletTransactions, fetchWalletTransactions, isLoading: isTransactionsLoading, error } = useWalletData(API_URL);
  const { tokenPrices, isLoading: isTokenPricesLoading } = useTokenPrices(API_URL, walletTransactions);
  const navigate = useNavigate();

  const handleWalletCheck = () => {
    fetchWalletTransactions(walletAddress);
    localStorage.setItem('walletAddress', walletAddress);
  };

  const isLoading = isTransactionsLoading || isTokenPricesLoading;

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

          {walletTransactions.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2 bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5] p-8 rounded-lg shadow-lg">
              {walletTransactions.map((transaction) => {
                const attributes = transaction.attributes || {};
                const transfers = attributes.transfers || [];

                const soldTransfer = transfers.find((t) => t.direction === 'out') || {};
                const boughtTransfer = transfers.find((t) => t.direction === 'in') || {};

                const soldValue = soldTransfer.quantity?.float || 0;
                const soldPriceThen = soldTransfer.price || 0;
                const soldSymbol = soldTransfer.fungible_info?.symbol?.toUpperCase() || 'N/A';
                const soldAddress = soldTransfer.fungible_info?.implementations?.[0]?.address || '';

                const boughtValue = boughtTransfer.quantity?.float || 0;
                const boughtPriceThen = boughtTransfer.price || 0;
                const boughtSymbol = boughtTransfer.fungible_info?.symbol?.toUpperCase() || 'N/A';
                const boughtAddress = boughtTransfer.fungible_info?.implementations?.[0]?.address || '';

                // Ensure unique keys by using transaction ID, address, and symbol
                const soldKey = `${transaction.transactionNumber}-sold-${soldSymbol}-${soldAddress}`;
                const boughtKey = `${transaction.transactionNumber}-bought-${boughtSymbol}-${boughtAddress}`;
                console.log(`Looking up prices for keys: Sold=${soldKey}, Bought=${boughtKey}`);

                const currentSoldPrice = tokenPrices && tokenPrices[`ethereum:${soldAddress.toLowerCase()}`] || 0;
                const currentBoughtPrice = tokenPrices && tokenPrices[`ethereum:${boughtAddress.toLowerCase()}`] || 0;

                const soldPerformance = soldPriceThen !== 0 ? ((currentSoldPrice - soldPriceThen) / soldPriceThen) * 100 : 'N/A';
                const boughtPerformance = boughtPriceThen !== 0 ? ((currentBoughtPrice - boughtPriceThen) / boughtPriceThen) * 100 : 'N/A';

                return (
                  <div key={`${transaction.transactionNumber}-${soldKey}-${boughtKey}`} className="bg-white p-6 rounded-lg shadow-lg">
                    <p><strong>Transaction #{transaction.transactionNumber}:</strong></p>
                    <p><strong>Transaction Action:</strong> {attributes.operation_type || 'N/A'}</p>
                    <p><strong>Sold:</strong> {soldValue ? `${soldValue} ${soldSymbol}` : 'N/A'}</p>
                    <p><strong>Sold (USD at time of trade):</strong> {soldPriceThen ? `$${(soldValue * soldPriceThen).toFixed(2)}` : 'N/A'}</p>
                    <p><strong>Bought:</strong> {boughtValue ? `${boughtValue} ${boughtSymbol}` : 'N/A'}</p>
                    <p><strong>Bought (USD at time of trade):</strong> {boughtPriceThen ? `$${(boughtValue * boughtPriceThen).toFixed(2)}` : 'N/A'}</p>
                    <p><strong>Current Sold Price (USD):</strong> {currentSoldPrice ? `$${(soldValue * currentSoldPrice).toFixed(2)}` : 'N/A'}</p>
                    <p><strong>Current Bought Price (USD):</strong> {currentBoughtPrice ? `$${(boughtValue * currentBoughtPrice).toFixed(2)}` : 'N/A'}</p>
                    <p><strong>Sold Performance:</strong> {soldPerformance !== 'N/A' ? `${soldPerformance.toFixed(2)}%` : 'N/A'}</p>
                    <p><strong>Bought Performance:</strong> {boughtPerformance !== 'N/A' ? `${boughtPerformance.toFixed(2)}%` : 'N/A'}</p>
                    <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>
                    <button
                      className="mt-2 p-2 bg-[#4A0E4E] text-white rounded"
                      onClick={() => navigate(`/transaction-details/${transaction.transactionNumber}`, { state: { transaction, prevPage: 'searchResults' } })}
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            !error && <p className="text-red-500 mb-4">No transactions available.</p>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionLookup;
