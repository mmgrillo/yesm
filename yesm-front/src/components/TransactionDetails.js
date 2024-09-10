import React, { useState, useEffect } from 'react';

const TransactionDetails = ({ txInfo }) => {
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    // Simulating recent transactions data for testing purposes
    const sampleRecentTransactions = [
      {
        blockchain: 'Ethereum',
        hash: '0xabc123...',
        method: 'Swap',
        amount: '100.50 USDT',
        difference: '10.50',
        swapInfo: {
          fromToken: 'USDT',
          toToken: 'ETH',
        },
        timestamp: Date.now(),
      },
      {
        blockchain: 'Ethereum',
        hash: '0xdef456...',
        method: 'Transfer',
        amount: '50.00 USDC',
        difference: '0.00',
        timestamp: Date.now(),
      }
    ];
    setRecentTransactions(sampleRecentTransactions); // Setting recent transactions for testing
  }, []);

  const truncateHash = (hash) => {
    return hash && hash.length > 15 ? hash.substring(0, 12) + '...' : hash;
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

  const renderDifference = (difference) => {
    const diff = parseFloat(difference);
    if (diff > 0) {
      return { label: 'Gain', value: `$${diff.toFixed(2)}` };
    } else if (diff < 0) {
      return { label: 'Loss', value: `-$${Math.abs(diff).toFixed(2)}` };
    } else {
      return { label: 'No change', value: '$0.00' };
    }
  };

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl" style={{ backgroundColor: '#FFEBCC' }}>
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold tracking-wide">Last Transaction</h2>
          <div className="space-y-2 text-left">
            <DetailRow label="Blockchain" value={txInfo.blockchain} />
            <DetailRow label="Status" value={txInfo.status} />
            <DetailRow label="Method" value={txInfo.method} />
            <DetailRow label="Amount" value={
              <>
                {txInfo.amount}
                {txInfo.tokenLogo && <img src={txInfo.tokenLogo} alt="Token Logo" className="inline w-5 h-5 ml-2" />}
              </>
            } isLongValue={true} />
            <DetailRow label="Value USD when transacted" value={txInfo.valueWhenTransacted} />
            <DetailRow label="Value USD today" value={txInfo.valueToday} />
            <DetailRow label="Fee" value={txInfo.fee} />
            <DetailRow label="Confirmations" value={txInfo.confirmations} />
            <DetailRow label="Sender" value={txInfo.from} isAddress={true} />
            <DetailRow label="Receiver" value={txInfo.to} isAddress={true} />
            <DetailRow label="Block Number" value={txInfo.blockNumber} />
            <DetailRow label="Timestamp" value={new Date(txInfo.timestamp).toLocaleString()} />
          </div>

          <div className="mt-4 p-3 rounded-lg bg-yellow-100 text-sm">
            <p className="font-semibold"><strong>Did you know?</strong> {txInfo.explanation}</p>
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
