import { useState, useEffect } from 'react';
import axios from 'axios';

const useVolatilityIndices = (timestamp) => {
  const [volatilityData, setVolatilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVolatilityData = async () => {
      if (!timestamp) return;

      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/volatility-indices/${timestamp}`
        );
        setVolatilityData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching volatility indices:', err);
        setError('Failed to fetch volatility indices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVolatilityData();
  }, [timestamp]);

  return { volatilityData, isLoading, error };
};

export default useVolatilityIndices;