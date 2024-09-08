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

  const DetailRow = ({ label, value, isAddress, isLongValue }) => (
    <div className={`py-2 border-b border-gray-200 ${isLongValue ? 'flex-col' : 'flex justify-between items-center'}`}>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className={`text-right break-words ${isLongValue ? 'mt-1' : ''}`}>
        {isAddress ? (
          <a
            href={`https://etherscan.io/address/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {truncateHash(value)}
          </a>
        ) : (
          <span className="font-semibold">{value}</span>
        )}
      </div>
    </div>
  );

  const renderSwapInfo = (swapInfo) => {
    if (!swapInfo) return null;
    return (
      <div className="mt-2 p-2 bg-blue-50 rounded-md">
        <p className="text-sm">
          Swap: {swapInfo.amountIn} {swapInfo.fromToken} ➔ {swapInfo.amountOutMin} {swapInfo.toToken}
        </p>
      </div>
    );
  };

  const { label: differenceLabel, value: differenceValue } = renderDifference(txInfo.difference);

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl" style={{ backgroundColor: '#FFEBCC' }}>
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold tracking-wide">Last Transaction</h2>
          <div className="space-y-2 text-left">
            <DetailRow label="Blockchain" value={txInfo.blockchain} />
            <DetailRow label="Status" value={txInfo.status} />
            <DetailRow label="Method" value={txInfo.method} />
            {txInfo.swapInfo && renderSwapInfo(txInfo.swapInfo)}
            <DetailRow label="Amount" value={txInfo.amount} isLongValue={true} />
            <DetailRow label="Value USD when transacted" value={txInfo.valueWhenTransacted} />
            <DetailRow label="Value USD today" value={txInfo.valueToday} />
            <DetailRow label={differenceLabel} value={differenceValue} />
            <DetailRow label="Fee" value={txInfo.fee} />
            <DetailRow label="Confirmations" value={txInfo.confirmations} />
            <DetailRow label="Sender" value={txInfo.from} isAddress={true} />
            <DetailRow label="Receiver" value={txInfo.to} isAddress={true} />
            <DetailRow label="Block Number" value={txInfo.blockNumber} />
            <DetailRow label="Timestamp" value={new Date(txInfo.timestamp).toLocaleString()} />
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-100 text-sm">
            <p className="font-semibold"><strong>Did you know?</strong> {renderConfirmationInfo()}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions - Collectible Card Style */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {recentTransactions.map((transaction, index) => {
          const { label: cardDiffLabel, value: cardDiffValue } = renderDifference(transaction.difference);
          return (
            <div
              key={index}
              className="relative p-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-yellow-200 to-yellow-400 border border-yellow-500"
            >
              <div className="relative z-10">
                <div className="mb-2 text-lg font-bold text-purple-800 uppercase tracking-wide">
                  {transaction.blockchain}
                </div>
                <a
                  href={`https://etherscan.io/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  <p className="text-xs text-gray-700 mb-1"><strong>Hash:</strong> {truncateHash(transaction.hash)}</p>
                </a>
                <p className="text-xs text-gray-700 mb-1"><strong>Method:</strong> {transaction.method}</p>
                {transaction.swapInfo && (
                  <p className="text-xs text-gray-700 mb-1">
                    <strong>Swap:</strong> {transaction.swapInfo.fromToken} ➔ {transaction.swapInfo.toToken}
                  </p>
                )}
                <div className="text-xs text-gray-700 mb-1">
                  <strong>Amount:</strong>
                  <div className="break-words">{transaction.amount}</div>
                </div>
                <p className="text-xs text-gray-700 mb-1"><strong>{cardDiffLabel}:</strong> {cardDiffValue}</p>
                <p className="text-xs text-gray-700"><strong>Date:</strong> {new Date(transaction.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionDetails;
