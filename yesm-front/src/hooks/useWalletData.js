import { useState } from 'react';
import axios from 'axios';

const useWalletData = (API_URL) => {
  const [walletBalances, setWalletBalances] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWalletData = async (walletAddress) => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}/portfolio?currency=usd`);
      const { balance, tokens } = response.data;

      setWalletBalances((prevBalances) => [...prevBalances, balance || 0]);
      setTokens((prevTokens) => [...prevTokens, ...(tokens || [])]);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data.');
    } finally {
      setIsLoading(false);
    }
  };

  return { walletBalances, tokens, fetchWalletData, isLoading, error };
};

export default useWalletData;
