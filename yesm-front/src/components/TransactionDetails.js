import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TransactionDetailRow = ({ label, value, isAddress }) => (
  <div className="flex justify-between py-2 border-b border-gray-200">
    <span className="text-gray-600">{label}</span>
    <span className="text-right">
      {isAddress ? (
        <a href={`https://etherscan.io/address/${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </span>
  </div>
);

// Function to calculate performance based on transaction and current token values
const calculatePerformance = (transaction) => {
  const quantity = transaction.attributes?.fee?.quantity?.float || 0;
  const priceAtTransaction = transaction.attributes?.fee?.price || 0;

  // Original value = quantity * price at transaction time
  const originalValue = quantity * priceAtTransaction;

  // Placeholder: Fetch the current price via an API (you need to replace this with actual API logic)
  const currentPrice = 100; // Replace this with the actual token's current price

  // Current value = quantity * current price
  const currentValue = quantity * currentPrice;

  // Prevent division by zero or invalid calculations
  if (!originalValue || originalValue === 0) {
    return 'N/A';  // Return 'N/A' if the original value is zero or undefined
  }

  // Performance calculation
  const performance = ((currentValue - originalValue) / originalValue) * 100;

  // Ensure performance is a valid number
  return isNaN(performance) ? 'N/A' : performance.toFixed(2);
};

const TransactionDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transaction } = location.state;

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold">Transaction Details</h2>

          <div className="space-y-2 text-left">
            <TransactionDetailRow label="Blockchain" value={transaction.attributes?.application_metadata?.contract_address || 'N/A'} />
            <TransactionDetailRow label="Operation Type" value={transaction.attributes?.operation_type || 'N/A'} />
            <TransactionDetailRow label="Sold" value={transaction.attributes?.fee?.fungible_info?.symbol || 'N/A'} />
            <TransactionDetailRow label="Bought" value={transaction.attributes?.bought_token?.symbol || 'N/A'} />
            <TransactionDetailRow label="Token Value" value={transaction.attributes?.fee?.quantity?.float || 'N/A'} />
            <TransactionDetailRow label="Performance" value={`${calculatePerformance(transaction)}%`} />
            <TransactionDetailRow label="From" value={transaction.sent_from} isAddress={true} />
            <TransactionDetailRow label="To" value={transaction.sent_to} isAddress={true} />
            <TransactionDetailRow label="Hash" value={transaction.hash} />
            <TransactionDetailRow label="Timestamp" value={transaction.attributes?.mined_at ? new Date(transaction.attributes.mined_at).toLocaleString() : 'N/A'} />

            {/* Detailed Transfers */}
            <h3 className="text-2xl font-bold mt-4">Transfers</h3>
            {transaction.transfers && transaction.transfers.map((transfer, index) => (
              <div key={index} className="border p-2 rounded-lg mb-2">
                <TransactionDetailRow label="From" value={transfer.from} isAddress={true} />
                <TransactionDetailRow label="To" value={transfer.to} isAddress={true} />
                <TransactionDetailRow label="Token" value={transfer.token} />
                <TransactionDetailRow label="Amount" value={transfer.amount} />
              </div>
            ))}
          </div>

          <button className="mt-4 p-2 bg-[#4A0E4E] text-white rounded hover:bg-[#6A2C6A] transition-colors" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
