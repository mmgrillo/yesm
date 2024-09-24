import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const location = useLocation();
  const navigate = useNavigate();

  const { transaction } = location.state;

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold">Transaction Details</h2>

          <div className="space-y-2 text-left">
            <TransactionDetailRow label="Blockchain" value={transaction.blockchain} />
            <TransactionDetailRow label="Sold" value={transaction.attributes?.fee?.fungible_info?.symbol} />
            <TransactionDetailRow label="Bought" value={transaction.attributes?.bought_token?.symbol} />
            <TransactionDetailRow label="Token Value" value={transaction.attributes?.fee?.quantity?.float} />
            <TransactionDetailRow label="Performance" value={`${transaction.performance || 'N/A'}`} />
            <TransactionDetailRow label="From" value={transaction.sent_from} isAddress={true} />
            <TransactionDetailRow label="To" value={transaction.sent_to} isAddress={true} />
            <TransactionDetailRow label="Hash" value={transaction.hash} />
            <TransactionDetailRow label="Timestamp" value={transaction.attributes?.mined_at ? new Date(transaction.attributes.mined_at).toLocaleString() : 'N/A'} />
          </div>

          {/* Back Button */}
          <button
            className="mt-4 p-2 bg-[#4A0E4E] text-white rounded hover:bg-[#6A2C6A] transition-colors"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
