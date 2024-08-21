import React from 'react';

const TransactionDetails = ({ txInfo }) => {
  const renderFeeInfo = () => {
    switch (txInfo.blockchain.toLowerCase()) {
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
    switch (txInfo.blockchain.toLowerCase()) {
      case 'ethereum':
        return "On Ethereum, 12 confirmations are generally considered safe for most transactions.";
      case 'bitcoin':
        return "For Bitcoin, 6 confirmations are typically considered secure, which takes about an hour.";
      default:
        return `For ${txInfo.blockchain}, ${txInfo.confirmations} confirmations have been recorded so far.`;
    }
  };

  return (
    <div className="bg-[#F0F8FF] p-4 rounded-lg shadow">
      <h2 className="text-2xl mb-4 text-[#4A0E4E]">Transaction Details</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p><strong>Blockchain:</strong> {txInfo.blockchain}</p>
          <p><strong>Status:</strong> {txInfo.status}</p>
          <p><strong>Amount:</strong> {txInfo.amount} (${txInfo.amountUSD})</p>
          {renderFeeInfo()}
        </div>
        <div>
          <p><strong>Confirmations:</strong> {txInfo.confirmations}</p>
          <p><strong>Sender:</strong> {txInfo.sender}</p>
          <p><strong>Receiver:</strong> {txInfo.receiver}</p>
        </div>
      </div>
      <div className="mt-4 bg-[#FFE4B5] p-2 rounded">
        <p className="text-sm"><strong>Did you know?</strong> {renderConfirmationInfo()}</p>
      </div>
    </div>
  );
};

export default TransactionDetails;