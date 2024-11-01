import { useState } from 'react';
import axios from 'axios';

const useWalletData = (API_URL) => {
  const [walletBalance, setWalletBalance] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWalletData = async (walletAddress) => {
    // Return early if no wallet address is provided
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}/portfolio?currency=usd`);
      const { balance, tokens } = response.data;
      setWalletBalance(balance || 0); // Default to 0 balance
      setTokens(tokens || []);        // Default to an empty array
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data.');
    } finally {
      setIsLoading(false);
    }
  };

  return { walletBalance, tokens, fetchWalletData, isLoading, error };
};

export default useWalletData;
