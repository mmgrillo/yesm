// TransactionDetails.js

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupportedImplementation } from '../utils/tokenUtils';
import useTokenPrices from '../hooks/useTokenPrices'; // Assuming this hook fetches token prices
import useWalletData from '../hooks/useWalletData'; // Assuming this hook fetches wallet details

const TransactionDetailRow = ({ label, value, isAddress }) => (
  <div className="flex justify-between py-2 border-b border-gray-200">
    <span className="text-gray-600 font-medium">{label}</span>
    <span className="text-right">
      {isAddress ? (
        <a href={`https://etherscan.io/address/${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {value || 'N/A'}
        </a>
      ) : (
        <span>{value || 'N/A'}</span>
      )}
    </span>
  </div>
);

const TransactionDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tokenPrices, isLoading: tokenPricesLoading } = useTokenPrices();
  const { walletDetails, isLoading: walletDetailsLoading } = useWalletData(); // Hypothetical wallet data hook

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Check if data is fully loaded
  useEffect(() => {
    if (!tokenPricesLoading && !walletDetailsLoading) {
      setIsDataLoaded(true);
    }
  }, [tokenPricesLoading, walletDetailsLoading]);

  const transaction = useMemo(() => location.state?.transaction || {}, [location.state]);
  const attributes = transaction.attributes || {};
  const transfers = useMemo(() => attributes.transfers || [], [attributes.transfers]);

  // Helper function to get current price from tokenPrices
  const getCurrentPrice = (chain, address, symbol) => {
    const priceKey = symbol.toLowerCase() === 'eth' ? 'ethereum:eth' : `${chain}:${address || symbol.toLowerCase()}`;
    return tokenPrices && tokenPrices[priceKey] ? tokenPrices[priceKey].usd : 'N/A';
  };

  if (!isDataLoaded) {
    return <p className="text-center mt-10 text-red-500">Loading transaction details...</p>;
  }

  return (
    <div className="p-8 min-h-screen flex flex-col items-center bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-3xl mb-8">
        <div className="p-6 rounded-lg shadow-lg bg-white border">
          <h2 className="text-3xl mb-6 text-[#4A0E4E] font-bold text-center">Transaction Details</h2>

          <div className="space-y-4">
            <TransactionDetailRow label="Blockchain" value={transaction.attributes?.application_metadata?.contract_address || 'N/A'} isAddress={true} />
            <TransactionDetailRow label="Operation Type" value={transaction.attributes?.operation_type || 'N/A'} />

            <h3 className="text-2xl font-semibold mt-6 mb-2 text-[#4A0E4E]">Transfers</h3>
            {transfers.length > 0 ? (
              transfers.map((transfer, index) => {
                const symbol = transfer.fungible_info?.symbol?.toUpperCase() || 'N/A';
                const implementation = getSupportedImplementation(transfer.fungible_info);
                const currentPrice = implementation
                  ? getCurrentPrice(implementation.chain_id, implementation.address, symbol)
                  : 'N/A';

                const amount = transfer.quantity?.float || 0;
                const historicalPrice = transfer.price || 0;

                return (
                  <div key={index} className="border p-4 rounded-lg bg-gray-50 mb-4">
                    <TransactionDetailRow label="From" value={transfer.from || 'N/A'} isAddress={true} />
                    <TransactionDetailRow label="To" value={transfer.to || 'N/A'} isAddress={true} />
                    <TransactionDetailRow label="Amount" value={amount} />
                    <TransactionDetailRow label="USD Value at the Time" value={`$${(amount * historicalPrice).toFixed(2)}`} />
                    <TransactionDetailRow label="Current USD Value" value={currentPrice !== 'N/A' ? `$${(amount * currentPrice).toFixed(2)}` : 'N/A'} />
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600">No transfer details available for this transaction.</p>
            )}
          </div>

          <div className="text-center mt-8">
            <button
              className="p-3 bg-[#4A0E4E] text-white rounded-lg hover:bg-[#6A2C6A] transition-colors"
              onClick={() => navigate('/search')}
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
