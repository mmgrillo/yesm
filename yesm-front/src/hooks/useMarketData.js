import { useState, useEffect } from 'react';
import axios from 'axios';

// Cache for frontend
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const useMarketData = (timestamp) => {
  const [marketData, setMarketData] = useState({
    fearGreed: null,
    macro: null,
    volatility: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!timestamp) return;

      setIsLoading(true);
      setError(null);

      const getCachedOrFetch = async (endpoint) => {
        const cacheKey = `${endpoint}_${timestamp}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          return cachedData.data;
        }

        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/${endpoint}/${timestamp}`,
            { timeout: 5000 } // 5 second timeout
          );
          
          cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
          
          return response.data;
        } catch (error) {
          console.error(`Error fetching ${endpoint}:`, error);
          return null;
        }
      };

      try {
        const [fearGreedData, macroData, volatilityData] = await Promise.allSettled([
          getCachedOrFetch('fear-greed-index'),
          getCachedOrFetch('macro-indicators'),
          getCachedOrFetch('volatility-indices')
        ]);

        setMarketData({
          fearGreed: fearGreedData.status === 'fulfilled' ? fearGreedData.value : null,
          macro: macroData.status === 'fulfilled' ? macroData.value : null,
          volatility: volatilityData.status === 'fulfilled' ? volatilityData.value : null
        });
      } catch (error) {
        console.error('Error fetching market data:', error);
        setError('Failed to fetch market data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timestamp]);

  return { marketData, isLoading, error };
};

export default useMarketData;