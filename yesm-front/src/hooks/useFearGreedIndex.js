// src/hooks/useFearGreedIndex.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const fearGreedCache = new Map();

const useFearGreedIndex = (timestamp) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!timestamp) return;
    
    const cacheKey = `fgi-${timestamp}`;
    if (fearGreedCache.has(cacheKey)) {
      setData(fearGreedCache.get(cacheKey));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/fear-greed-index/${timestamp}`
      );
      fearGreedCache.set(cacheKey, response.data);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching Fear & Greed Index:', err);
      setError('Failed to fetch Fear & Greed Index');
    } finally {
      setIsLoading(false);
    }
  }, [timestamp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { fearGreedIndex: data, isLoading, error };
};

export default useFearGreedIndex;