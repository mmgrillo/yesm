import React, { useEffect, useRef } from 'react';
import useWalletData from '../hooks/useWalletData';

const WalletBalance = ({ walletAddress }) => {
  const { walletBalance, tokens, fetchWalletData, isLoading, error } = useWalletData(process.env.REACT_APP_API_URL);
  const hasFetched = useRef(false); // Use a ref to track if data has already been fetched

  useEffect(() => {
    if (walletAddress && !hasFetched.current) {
      fetchWalletData(walletAddress);
      hasFetched.current = true; // Mark as fetched
    }
  }, [walletAddress, fetchWalletData]);

  if (isLoading) return <p>Loading wallet data...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">Wallet Balance</h3>
      <p><strong>Total Balance:</strong> ${walletBalance ? walletBalance.toFixed(2) : 'N/A'}</p>
      <h4 className="mt-4 mb-2 font-semibold">Tokens:</h4>
      {tokens.length > 0 ? (
        <ul className="list-disc list-inside">
          {tokens.map((token, index) => (
            <li key={index}>
              {token.chain}: {token.amount}
            </li>
          ))}
        </ul>
      ) : (
        <p>No tokens available.</p>
      )}
    </div>
  );
};

export default WalletBalance;
