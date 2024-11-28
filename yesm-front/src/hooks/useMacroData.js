// src/hooks/useMacroData.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const macroCache = new Map();

const useMacroData = (timestamp) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!timestamp) return;
    
    const cacheKey = `macro-${timestamp}`;
    if (macroCache.has(cacheKey)) {
      setData(macroCache.get(cacheKey));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/macro-indicators/${timestamp}`
      );
      macroCache.set(cacheKey, response.data);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching macro data:', err);
      setError('Failed to fetch macro data');
    } finally {
      setIsLoading(false);
    }
  }, [timestamp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { macroData: data, isLoading, error };
};

export default useMacroData;