// hooks/useFearGreedIndex.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const useFearGreedIndex = (timestamp) => {
  const [fearGreedIndex, setFearGreedIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFGIndex = async () => {
      if (!timestamp) return;

      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/fear-greed-index/${timestamp}`
        );
        setFearGreedIndex(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching Fear & Greed Index:', err);
        setError('Failed to fetch Fear & Greed Index');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFGIndex();
  }, [timestamp]);

  return { fearGreedIndex, isLoading, error };
};

export default useFearGreedIndex;