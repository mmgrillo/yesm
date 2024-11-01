import React, { useEffect, useRef } from 'react';
import useWalletData from '../hooks/useWalletData';

const WalletBalance = ({ walletAddress }) => {
  const { walletBalance, tokens, fetchWalletData, isLoading, error } = useWalletData(process.env.REACT_APP_API_URL);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (walletAddress && !hasFetched.current) {
      fetchWalletData(walletAddress);
      hasFetched.current = true;
    }
  }, [walletAddress, fetchWalletData]);

  if (isLoading) return <p>Loading wallet data...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const formattedBalance = typeof walletBalance === 'number' ? walletBalance.toLocaleString() : 'N/A';

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mt-6 flex flex-col md:flex-row justify-between items-start md:items-center">
      <div className="flex-1">
        <h3 className="text-3xl font-bold mb-4">Wallet Balance</h3>
        <p className="text-4xl font-semibold mb-4">
          Total Balance: <span className="text-[#4A0E4E]">${formattedBalance}</span>
        </p>
      </div>
      <div className="flex-1 bg-[#FFE4B5] p-4 rounded-lg shadow-md md:ml-4 w-full md:w-auto">
        <h4 className="text-lg font-semibold mb-2">Tokens:</h4>
        {tokens.length > 0 ? (
          <ul className="list-none space-y-2">
            {tokens.map((token, index) => (
              <li key={index} className="flex justify-between">
                <span className="font-medium">{token.chain}</span>
                <span className="text-right">${parseFloat(token.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No tokens available.</p>
        )}
      </div>
    </div>
  );
};

export default WalletBalance;
