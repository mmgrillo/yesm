import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';  // Import useNavigate for navigation

const TransactionDetailRow = ({ label, value, isAddress }) => (
  <div className="flex justify-between py-2 border-b border-gray-200">
    <span className="text-gray-600">{label}</span>
    <span className="text-right">
      {isAddress ? (
        <a
          href={`https://etherscan.io/address/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </span>
  </div>
);

const TransactionDetails = () => {
  const location = useLocation();  // Use useLocation to get the transaction passed from routing
  const navigate = useNavigate();  // Initialize useNavigate to go back

  const { transaction } = location.state;  // Get the transaction data from the state

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold">Transaction Details</h2>

          <div className="space-y-2 text-left">
            <TransactionDetailRow label="Blockchain" value={transaction.blockchain} />
            <TransactionDetailRow label="Status" value={transaction.status} />
            <TransactionDetailRow label="Method" value={transaction.method} />
            <TransactionDetailRow label="Amount" value={transaction.amount} />
            <TransactionDetailRow label="Value When Transacted" value={transaction.valueWhenTransacted} />
            <TransactionDetailRow label="Value Today" value={transaction.valueToday} />
            <TransactionDetailRow label="Performance" value={`${transaction.performance}%`} />
            <TransactionDetailRow label="From" value={transaction.from} isAddress={true} />
            <TransactionDetailRow label="To" value={transaction.to} isAddress={true} />
            <TransactionDetailRow label="Hash" value={transaction.hash} />
            <TransactionDetailRow label="Timestamp" value={new Date(transaction.timestamp).toLocaleString()} />
          </div>

          {/* Back Button */}
          <button
            className="mt-4 p-2 bg-[#4A0E4E] text-white rounded hover:bg-[#6A2C6A] transition-colors"
            onClick={() => navigate(-1)}  // Use navigate(-1) to go back to the previous page
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
