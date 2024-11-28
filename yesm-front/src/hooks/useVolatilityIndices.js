// src/hooks/useVolatilityIndices.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const volatilityCache = new Map();

const useVolatilityIndices = (timestamp) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!timestamp) return;
    
    const cacheKey = `volatility-${timestamp}`;
    if (volatilityCache.has(cacheKey)) {
      setData(volatilityCache.get(cacheKey));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/volatility-indices/${timestamp}`
      );
      volatilityCache.set(cacheKey, response.data);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching volatility indices:', err);
      setError('Failed to fetch volatility indices');
    } finally {
      setIsLoading(false);
    }
  }, [timestamp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { volatilityData: data, isLoading, error };
};

export default useVolatilityIndices;