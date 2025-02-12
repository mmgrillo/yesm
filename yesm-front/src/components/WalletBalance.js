import React, { useEffect, useRef } from 'react';
import useWalletData from '../hooks/useWalletData';

const WalletBalance = ({ walletAddresses, onBalanceFetched, adjustedBalance }) => {
  const { walletBalances, tokens, fetchWalletData, isLoading, error } = useWalletData();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (walletAddresses && !hasFetched.current) {
      walletAddresses.forEach((address) => fetchWalletData(address));
      hasFetched.current = true;
    }
  }, [walletAddresses, fetchWalletData]);

  // Calculate total balance
  const totalBalance = walletBalances.reduce((acc, balance) => acc + balance, 0);

  // Pass the fetched balance to TransactionLookup
  useEffect(() => {
    if (onBalanceFetched) {
      onBalanceFetched(totalBalance);
    }
  }, [totalBalance, onBalanceFetched]);

  if (isLoading) return <p>Loading wallet data...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mt-6">
      <h3 className="text-3xl font-bold mb-4">Wallet Balances</h3>
      {walletAddresses.map((address, index) => (
        <div key={index} className="mb-4">
          <p className="text-lg font-semibold">
            Wallet Balance {index + 1} ({address.slice(0, 4)}...):{' '}
            <span className="text-[#4A0E4E]">${walletBalances[index]?.toFixed(2) || '0.00'}</span>
          </p>
        </div>
      ))}
      <p className="text-2xl font-bold">
        Total Balance: <span className="text-[#4A0E4E]">${totalBalance.toFixed(2)}</span> 
        <span className="text-sm text-gray-700 ml-4">Adjusted Balance: <span className="text-[#4A0E4E]">${adjustedBalance.toFixed(2)}</span></span>
      </p>

      <div className="bg-[#FFE4B5] p-4 rounded-lg shadow-md mt-4">
        <h4 className="text-lg font-semibold mb-2">Tokens:</h4>
        {tokens.length > 0 ? (
          <ul className="list-none space-y-2">
            {tokens.map((token, index) => (
              <li key={index} className="flex justify-between">
                <span className="font-medium">{token.chain}</span>
                <span className="text-right">
                  ${parseFloat(token.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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
