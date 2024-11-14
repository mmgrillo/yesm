// useMarketData.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

export const useMarketData = (timestamp) => {
  const [marketData, setMarketData] = useState({
    fearGreed: null,
    macroData: null,
    volatilityData: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!timestamp) return;

      setIsLoading(true);
      setError(null);

      const fetchWithRetry = async (endpoint, retries = 3) => {
        const cacheKey = `${endpoint}_${timestamp}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          return cachedData.data;
        }

        for (let i = 0; i < retries; i++) {
          try {
            const response = await axios.get(
              `${process.env.REACT_APP_API_URL}/api/${endpoint}/${timestamp}`,
              { 
                timeout: 10000,
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              }
            );
            
            cache.set(cacheKey, {
              data: response.data,
              timestamp: Date.now()
            });
            
            return response.data;
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      };

      try {
        const [fearGreedData, macroData] = await Promise.all([
          fetchWithRetry('fear-greed-index').catch(() => null),
          fetchWithRetry('macro-indicators').catch(() => null)
        ]);

        setMarketData({
          fearGreed: fearGreedData,
          macroData: macroData,
          volatilityData: null // Removed as it's not in database
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

// useTokenPrices.js
export const useTokenPrices = (API_URL, walletTransactions) => {
  const [tokenPrices, setTokenPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrices = async (tokens) => {
    try {
      const response = await axios.post(`${API_URL}/token-prices`, { tokens });
      return response.data;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!walletTransactions?.length) return;
      
      setIsLoading(true);
      const uniqueTokens = new Map();

      walletTransactions.forEach(transaction => {
        if (!transaction.token_address || !transaction.chain) return;
        
        const key = `${transaction.chain}:${transaction.token_address}`;
        if (!uniqueTokens.has(key)) {
          uniqueTokens.set(key, {
            chain: transaction.chain,
            address: transaction.token_address,
            symbol: transaction.token_symbol
          });
        }
      });

      try {
        const prices = await fetchPrices(Array.from(uniqueTokens.values()));
        setTokenPrices(prices);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [API_URL, walletTransactions]);

  return { tokenPrices, isLoading, error };
};

export default useMarketData;