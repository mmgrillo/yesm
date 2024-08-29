import React, { useState, useEffect } from 'react';

const TransactionDetails = ({ txInfo }) => {
  const [recentTransactions, setRecentTransactions] = useState([]);

  const renderConfirmationInfo = () => {
    switch (txInfo.blockchain?.toLowerCase()) {
      case 'ethereum':
        return "On Ethereum, 12 confirmations are generally considered safe for most transactions.";
      case 'bitcoin':
        return "For Bitcoin, 6 confirmations are typically considered secure, which takes about an hour.";
      default:
        return `For ${txInfo.blockchain}, ${txInfo.confirmations} confirmations have been recorded so far.`;
    }
  };

  const truncateHash = (hash) => {
    return hash && hash.length > 15 ? hash.substring(0, 12) + '...' : hash;
  };

  useEffect(() => {
    if (txInfo) {
      setRecentTransactions((prevTransactions) => {
        const updatedTransactions = [txInfo, ...prevTransactions];
        return updatedTransactions.slice(0, 3); // Keep only the last three transactions
      });
    }
  }, [txInfo]);

  const renderDifference = (difference) => {
    if (difference === 'N/A') return { label: 'Difference', value: 'N/A' };
    const diff = parseFloat(difference);
    if (diff > 0) {
      return { label: 'You are a King 👑', value: `$${diff.toFixed(2)}` };
    } else if (diff < 0) {
      return { label: 'You are a Fool 😂', value: `-$${Math.abs(diff).toFixed(2)}` };
    } else {
      return { label: 'No change', value: '$0.00' };
    }
  };

  const DetailRow = ({ label, value, isAddress }) => (
    <div className="py-3 border-b border-gray-300">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      <div className="text-right break-words">
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
          value
        )}
      </div>
    </div>
  );

  const { label: differenceLabel, value: differenceValue } = renderDifference(txInfo.difference);

  return (
    <div className="p-8 min-h-screen flex flex-col items-center shadow-2xl" style={{ backgroundColor: '#FFEBCC' }}>
      <div className="w-full max-w-4xl mb-8 text-center">
        <div className="p-8 rounded-lg shadow-md bg-yellow-100 border-2" style={{ backgroundColor: '#FFF7E6', borderColor: '#FFD700', borderWidth: '2px' }}>
        <h2 className="text-4xl mb-6 text-[#4A0E4E] font-bold tracking-wide">Last Transaction</h2>
          <div className="space-y-4 text-left">
            <DetailRow label="Blockchain" value={txInfo.blockchain} />
            <DetailRow label="Status" value={txInfo.status} />
            <DetailRow label="Amount" value={txInfo.amount} />
            <DetailRow label="Value USD when transacted" value={txInfo.valueWhenTransacted} />
            <DetailRow label="Value USD today" value={txInfo.valueToday} />
            <DetailRow label={differenceLabel} value={differenceValue} />
            <DetailRow label="Fee" value={txInfo.fee} />
            <DetailRow label="Confirmations" value={txInfo.confirmations} />
            <DetailRow label="Sender" value={txInfo.from} isAddress={true} />
            <DetailRow label="Receiver" value={txInfo.to} isAddress={true} />
            <DetailRow label="Block Number" value={txInfo.blockNumber} />
            <DetailRow label="Timestamp" value={txInfo.timestamp ? new Date(txInfo.timestamp).toLocaleString() : 'N/A'} />
          </div>
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FFE4B5' }}>
            <p className="text-sm font-semibold"><strong>Did you know?</strong> {renderConfirmationInfo()}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions - Collectible Card Style */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {recentTransactions.map((transaction, index) => {
          const { label: cardDiffLabel, value: cardDiffValue } = renderDifference(transaction.difference);
          return (
            <div
              key={index}
              className="relative p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-yellow-300 to-yellow-500 border-2 border-yellow-600"
            >
              <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
              <div className="relative z-10">
                <div className="mb-3 text-xl font-bold text-purple-800 uppercase tracking-wide">
                  {transaction.blockchain}
                </div>
                <a
                  href={`https://etherscan.io/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  <p className="text-sm text-gray-700 mb-2"><strong>Hash:</strong> {truncateHash(transaction.hash)}</p>
                </a>
                <div className="text-sm text-gray-700 mb-2">
                  <strong>Amount:</strong>
                  <div className="break-words">{transaction.amount}</div>
                </div>
                <p className="text-sm text-gray-700 mb-2"><strong>{cardDiffLabel}:</strong> {cardDiffValue}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Date:</strong> {new Date(transaction.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionDetails;