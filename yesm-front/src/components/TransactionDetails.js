import React, { useState, useEffect } from 'react';

const TransactionDetails = ({ txInfo }) => {
  const [recentTransactions, setRecentTransactions] = useState([]);

  const renderFeeInfo = () => {
    switch (txInfo.blockchain?.toLowerCase()) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
        return (
          <p><strong>Gas Fee:</strong> {txInfo.fee} ETH (${txInfo.feeUSD})</p>
        );
      case 'bitcoin':
        return (
          <p><strong>Transaction Fee:</strong> {txInfo.fee} BTC (${txInfo.feeUSD})</p>
        );
      default:
        return (
          <p><strong>Fee:</strong> {txInfo.fee} (${txInfo.feeUSD})</p>
        );
    }
  };

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
    return hash && hash.length > 20 ? hash.substring(0, 17) + '...' : hash;
  };

  // Update the recent transactions list whenever a new transaction is fetched
  useEffect(() => {
    if (txInfo) {
      setRecentTransactions((prevTransactions) => {
        const updatedTransactions = [txInfo, ...prevTransactions];
        return updatedTransactions.slice(0, 3); // Keep only the last three transactions
      });
    }
  }, [txInfo]);

  return (
    <div className="p-8 bg-[#FFEFD5] min-h-screen flex flex-col items-center shadow-2xl">
      {/* Last Transaction */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <div className="p-6 rounded-lg">
          <h2 className="text-3xl mb-4 text-[#4A0E4E]">Last Transaction</h2>
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 text-left">
            <p><strong>Blockchain:</strong> {txInfo.blockchain}</p>
            <p><strong>Status:</strong> {txInfo.status}</p>
            <p><strong>Amount:</strong> {txInfo.amount} ({txInfo.amountUSD ? `$${txInfo.amountUSD}` : '$N/A'})</p>
            <p><strong>Fee:</strong> {txInfo.fee} ({txInfo.feeUSD ? `$${txInfo.feeUSD}` : '$N/A'})</p>
            <p><strong>Confirmations:</strong> {txInfo.confirmations}</p>
            <p><strong>Sender:</strong>
              <span className="relative group">
                <span className="inline-block max-w-full md:max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {truncateHash(txInfo.from)}
                </span>
                <span className="hidden absolute left-0 bottom-full bg-white border border-gray-300 p-2 rounded shadow-lg group-hover:block">
                  {txInfo.from}
                </span>
              </span>
            </p>
            <p><strong>Receiver:</strong>
              <span className="relative group">
                <span className="inline-block max-w-full md:max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {truncateHash(txInfo.to)}
                </span>
                <span className="hidden absolute left-0 bottom-full bg-white border border-gray-300 p-2 rounded shadow-lg group-hover:block">
                  {txInfo.to}
                </span>
              </span>
            </p>
            <p><strong>Block Number:</strong> {txInfo.blockNumber}</p>
            <p><strong>Timestamp:</strong> {txInfo.timestamp ? new Date(txInfo.timestamp).toLocaleString() : 'N/A'}</p>
          </div>
          <div className="mt-4 bg-[#FFE4B5] p-2 rounded">
            <p className="text-sm"><strong>Did you know?</strong> {renderConfirmationInfo()}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {recentTransactions.map((transaction, index) => (
          <div key={index} className="p-4 rounded-lg border border-black shadow-2xl">
            <p><strong>Blockchain:</strong> {transaction.blockchain}</p>
            <p><strong>Hash:</strong> {truncateHash(transaction.hash)}</p>
            <p><strong>Status:</strong> {transaction.status}</p>
            <p><strong>Amount:</strong> {transaction.amount} (${transaction.amountUSD})</p>
            <p><strong>Block Number:</strong> {transaction.blockNumber}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionDetails;
