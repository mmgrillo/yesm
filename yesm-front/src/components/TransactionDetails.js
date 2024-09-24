import React from 'react';

// Component to render individual details for a single transaction
const TransactionDetailRow = ({ label, value, isAddress, isLongValue }) => (
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

// Helper function to truncate long hashes in the middle
const truncateHash = (hash) => {
  return hash && hash.length > 15 ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : hash;
};

// Main component
const TransactionDetails = ({ txInfo, walletTransactions }) => {

  // Render list of wallet transactions when provided
  const renderWalletTransactions = () => {
    return (      
      <div className="p-6 rounded-lg shadow-md bg-gradient-to-b from-[#FFB6C1] to-[#FFE4B5]">
        <h2 className="text-3xl font-bold text-[#4A0E4E] mb-4">Wallet Transactions</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {walletTransactions.map((transaction, index) => (
            <div key={index} className="bg-[#FFE4B5] p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>Hash:</strong> {truncateHash(transaction.attributes.hash)}
              </p>
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>From:</strong> {truncateHash(transaction.attributes.sent_from)}
              </p>
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>To:</strong> {truncateHash(transaction.attributes.sent_to)}
              </p>
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>Timestamp:</strong> {new Date(transaction.attributes.mined_at).toLocaleString()}
              </p>
              <p className="text-sm text-green-400">
                <strong>Operation Type:</strong> {transaction.attributes.operation_type}
              </p>
              <p className="text-sm text-green-400">
                <strong>Trade Performance:</strong> {transaction.tradePerformance}%
              </p>
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>Sold Price:</strong> ${transaction.soldPrice}
              </p>
              <p className="text-sm text-[#4A0E4E] mb-2">
                <strong>Current Price:</strong> ${transaction.currentPrice}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render section depending on the data available
  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        {walletTransactions && walletTransactions.length > 0 ? (
          renderWalletTransactions()  // If wallet transactions exist, render them
        ) : (
          <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
            <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold tracking-wide">Last Transaction</h2>
            <div className="space-y-2 text-left">
              <TransactionDetailRow label="Blockchain" value={txInfo.blockchain} />
              <TransactionDetailRow label="Status" value={txInfo.status} />
              <TransactionDetailRow label="Method" value={txInfo.method} />
              <TransactionDetailRow
                label="Amount"
                value={<>{txInfo.amount}{txInfo.tokenLogo && <img src={txInfo.tokenLogo} alt="Token Logo" className="inline w-5 h-5 ml-2" />}</>}
                isLongValue={true}
              />
              <TransactionDetailRow label="Value USD when transacted" value={txInfo.valueWhenTransacted} />
              <TransactionDetailRow label="Value USD today" value={txInfo.valueToday} />
              <TransactionDetailRow label="Fee" value={txInfo.fee} />
              <TransactionDetailRow label="Confirmations" value={txInfo.confirmations} />
              <TransactionDetailRow label="Sender" value={txInfo.from} isAddress={true} />
              <TransactionDetailRow label="Receiver" value={txInfo.to} isAddress={true} />
              <TransactionDetailRow label="Block Number" value={txInfo.blockNumber} />
              <TransactionDetailRow label="Timestamp" value={new Date(txInfo.timestamp).toLocaleString()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDetails;
