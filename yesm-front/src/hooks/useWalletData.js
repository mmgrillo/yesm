import { useState } from 'react';
import axios from 'axios';

const useWalletData = (API_URL) => {
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWalletTransactions = async (walletAddress) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wallet/${walletAddress}`);
      setWalletTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch wallet transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  return { walletTransactions, fetchWalletTransactions, isLoading, error };
};

export default useWalletData;
