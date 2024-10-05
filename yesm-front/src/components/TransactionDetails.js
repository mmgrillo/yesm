import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

// Function to fetch current ETH price from CoinGecko
const getCurrentEthPrice = async () => {
  const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  return response.data.ethereum.usd;
};

const TransactionDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transaction } = location.state;

  const soldValue = transaction.transfers?.find(t => t.direction === 'out')?.quantity?.float || 'N/A';
  const boughtValue = transaction.transfers?.find(t => t.direction === 'in')?.quantity?.float || 'N/A';
  
  const soldValueInUsdThen = soldValue * transaction.transfers[0]?.fungible_info?.price || 0;
  const [soldValueInUsdNow, setSoldValueInUsdNow] = useState(0);

  useEffect(() => {
    const fetchEthPrice = async () => {
      const currentEthPrice = await getCurrentEthPrice();
      setSoldValueInUsdNow(soldValue * currentEthPrice);
    };

    fetchEthPrice();
  }, [soldValue]);

  return (
    <div className="p-4 min-h-screen flex flex-col items-center shadow-2xl bg-gradient-to-t from-[#FFB6C1] to-[#FFE4B5]">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="p-6 rounded-lg shadow-md bg-yellow-50 border-2" style={{ borderColor: '#FFD700' }}>
          <h2 className="text-3xl mb-4 text-[#4A0E4E] font-bold">Transaction Details</h2>

          <div className="space-y-2 text-left">
            <TransactionDetailRow label="Blockchain" value={transaction.attributes?.application_metadata?.contract_address || 'N/A'} />
            <TransactionDetailRow label="Operation Type" value={transaction.attributes?.operation_type || 'N/A'} />
            <TransactionDetailRow label="Sold" value={`${soldValue} ETH`} />
            <TransactionDetailRow label="Bought" value={`${boughtValue || 'N/A'} ETH`} />
            <TransactionDetailRow label="Token Value (Sold)" value={`$${soldValueInUsdThen.toFixed(2)}`} />
            <TransactionDetailRow label="Current Value (USD)" value={`$${soldValueInUsdNow.toFixed(2)}`} />
            <TransactionDetailRow label="From" value={transaction.sent_from} isAddress={true} />
            <TransactionDetailRow label="To" value={transaction.sent_to} isAddress={true} />
            <TransactionDetailRow label="Hash" value={transaction.hash} />
            <TransactionDetailRow label="Timestamp" value={transaction.attributes?.mined_at ? new Date(transaction.attributes.mined_at).toLocaleString() : 'N/A'} />

            {/* Display all transfers */}
            <h3 className="text-2xl font-bold mt-4">Transfers</h3>
            {transaction.transfers && transaction.transfers.map((transfer, index) => (
              <div key={index} className="border p-2 rounded-lg mb-2">
                <TransactionDetailRow label="From" value={transfer.from} isAddress={true} />
                <TransactionDetailRow label="To" value={transfer.to} isAddress={true} />
                <TransactionDetailRow label="Amount" value={transfer.quantity?.float} />
                <TransactionDetailRow label="USD Value at the time" value={`$${(transfer.quantity?.float * transfer.fungible_info?.price).toFixed(2)}`} />
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
