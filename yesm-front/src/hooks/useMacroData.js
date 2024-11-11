import { useState, useEffect } from 'react';
import axios from 'axios';

const useMacroData = (timestamp) => {
  const [macroData, setMacroData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMacroData = async () => {
      if (!timestamp) return;

      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/macro-indicators/${timestamp}`
        );
        setMacroData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching macro data:', err);
        setError('Failed to fetch macro data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMacroData();
  }, [timestamp]);

  return { macroData, isLoading, error };
};

export default useMacroData;