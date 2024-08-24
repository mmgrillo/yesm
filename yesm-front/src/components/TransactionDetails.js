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

  const truncateAmount = (amount) => {
    return amount && amount.length > 10 ? amount.substring(0, 7) + '...' : amount;
  };

  useEffect(() => {
    if (txInfo) {
      setRecentTransactions((prevTransactions) => {
        const updatedTransactions = [txInfo, ...prevTransactions];
        return updatedTransactions.slice(0, 3); // Keep only the last three transactions
      });
    }
  }, [txInfo]);

  const DetailRow = ({ label, value, isAddress }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-300">
      <span className="font-semibold text-gray-700">{label}:</span>
      <span className="text-right">
        {isAddress ? (
          <a
            href={`https://etherscan.io/address/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            <span className="group relative">
              {truncateHash(value)}
              <span className="invisible group-hover:visible absolute -top-8 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {value}
              </span>
            </span>
          </a>
        ) : (
          <span className="group relative">
            {typeof value === 'string' && value.length > 15 ? truncateHash(value) : value}
            {typeof value === 'string' && value.length > 15 && (
              <span className="invisible group-hover:visible absolute -top-8 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {value}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div className="p-8 min-h-screen flex flex-col items-center shadow-2xl" style={{ backgroundColor: '#FFEBCC' }}>
      <div className="w-full max-w-4xl mb-8 text-center">
        <div className="p-8 rounded-lg shadow-md" style={{ backgroundColor: '#FFF7E6', borderColor: '#FFD700', borderWidth: '2px' }}>
          <h2 className="text-4xl mb-6 text-[#4A0E4E] font-bold tracking-wide">Last Transaction</h2>
          <div className="space-y-4 text-left">
            <DetailRow label="Blockchain" value={txInfo.blockchain} />
            <DetailRow label="Status" value={txInfo.status} />
            <DetailRow label="Amount" value={`${txInfo.amount} (${txInfo.amountUSD ? `$${txInfo.amountUSD}` : '$N/A'})`} />
            <DetailRow label="Fee" value={`${txInfo.fee} (${txInfo.feeUSD ? `$${txInfo.feeUSD}` : '$N/A'})`} />
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
        {recentTransactions.map((transaction, index) => (
          <div
            key={index}
            className="relative p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
            style={{
              backgroundColor: '#FFF7E6',
              border: '2px solid #FFD700',
              borderRadius: '16px',
            }}
          >
            <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
            <div className="relative z-10">
              <div className="mb-3 text-xl font-bold text-[#4A0E4E] uppercase tracking-wide">
                {transaction.blockchain}
              </div>
              <a
                href={`https://etherscan.io/tx/${transaction.hash || transaction.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                <p className="text-sm text-gray-700 mb-2"><strong>Hash:</strong> {truncateHash(transaction.hash || transaction.txHash)}</p>
              </a>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Amount:</strong>
                <br />
                {truncateAmount(transaction.amount)} (${transaction.amountUSD})
              </p>
              <p className="text-sm text-gray-700"><strong>Block Number:</strong> {transaction.blockNumber}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionDetails;
