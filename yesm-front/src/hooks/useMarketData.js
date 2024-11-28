import { useState, useEffect } from 'react';
import axios from 'axios';

const useMarketData = (timestamp) => {
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
    
      try {
        const API_URL = process.env.REACT_APP_API_URL;
        // Convert timestamp to Unix format if it's not already
        const unixTimestamp = typeof timestamp === 'string' ? 
          Math.floor(new Date(timestamp).getTime() / 1000) : timestamp;
    
        console.log('Fetching market data for timestamp:', unixTimestamp);
    
        const [fearGreedRes, macroRes, volatilityRes] = await Promise.all([
          axios.get(`${API_URL}/fear-greed-index/${unixTimestamp}`).catch(err => {
            console.error('Fear & Greed fetch error:', err);
            return { data: null };
          }),
          axios.get(`${API_URL}/macro-indicators/${unixTimestamp}`).catch(err => {
            console.error('Macro indicators fetch error:', err);
            return { data: null };
          }),
          axios.get(`${API_URL}/volatility-indices/${unixTimestamp}`).catch(err => {
            console.error('Volatility indices fetch error:', err);
            return { data: null };
          })
        ]);
    
        setMarketData({
          fearGreed: fearGreedRes.data,
          macroData: macroRes.data,
          volatilityData: volatilityRes.data
        });
      } catch (error) {
        console.error('Market data fetch error:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timestamp]);

  return { marketData, isLoading, error };
};

export default useMarketData;