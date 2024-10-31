// TransactionDetails.js

import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TransactionDetailRow = ({ label, value, isAddress }) => (
  <div className="flex justify-between py-2 border-b border-gray-200">
    <span className="text-gray-600">{label}</span>
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

const TransactionDetails = ({ tokenPrices }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const transaction = useMemo(() => location.state?.transaction || {}, [location.state]);
  const attributes = transaction.attributes || {};
  const transfers = useMemo(() => attributes.transfers || [], [attributes.transfers]);

  useEffect(() => {
    console.log("Displaying transaction with updated current prices:", transaction);
  }, [transaction, tokenPrices]);

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold">Transaction Details</h2>

          <div className="space-y-2 text-left">
            <TransactionDetailRow label="Blockchain" value={transaction.attributes?.application_metadata?.contract_address || 'N/A'} />
            <TransactionDetailRow label="Operation Type" value={transaction.attributes?.operation_type || 'N/A'} />

            <h3 className="text-2xl font-bold mt-4">Transfers</h3>
            {transfers.length > 0 ? (
              transfers.map((transfer, index) => {
                const currentPrice = tokenPrices[`ethereum:${transfer.fungible_info?.implementations?.[0]?.address?.toLowerCase() || 'eth'}`]?.usd || 0;
                const amount = transfer.quantity?.float || 0;
                const historicalPrice = transfer.price || 0;

                return (
                  <div key={index} className="border p-2 rounded-lg mb-2">
                    <TransactionDetailRow label="From" value={transfer.from || 'N/A'} isAddress={true} />
                    <TransactionDetailRow label="To" value={transfer.to || 'N/A'} isAddress={true} />
                    <TransactionDetailRow label="Amount" value={amount} />
                    <TransactionDetailRow label="USD Value at the time" value={`$${(amount * historicalPrice).toFixed(2)}`} />
                    <TransactionDetailRow label="Current USD Value" value={`$${(amount * currentPrice).toFixed(2)}`} />
                  </div>
                );
              })
            ) : (
              <p>No transfer details available for this transaction.</p>
            )}
          </div>

          <button
            className="mt-4 p-2 bg-[#4A0E4E] text-white rounded hover:bg-[#6A2C6A] transition-colors"
            onClick={() => navigate('/search')}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
