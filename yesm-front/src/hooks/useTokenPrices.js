// useTokenPrices.js (frontend)
import { useState, useEffect, useCallback } from 'react';
import fetchTokenPrices from '../services/tokenPriceService';
import { getSupportedImplementation } from '../utils/tokenUtils';

const useTokenPrices = (API_URL, walletTransactions) => {
  const [tokenPrices, setTokenPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllTokenPrices = useCallback(async () => {
    if (!walletTransactions?.length) return;
    
    setIsLoading(true);
    const uniqueTokens = new Map(); // Using Map instead of Set for better control

    // Collect unique tokens from transactions
    walletTransactions.forEach(transaction => {
      const transfers = transaction.attributes?.transfers || [];
      transfers.forEach(transfer => {
        const tokenInfo = transfer.fungible_info;
        if (!tokenInfo) return;
        
        const implementation = getSupportedImplementation(tokenInfo);
        if (!implementation) return;

        const key = tokenInfo.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' 
          : `${implementation.chain_id}:${implementation.address}`;
        
        // Only add if not already in map
        if (!uniqueTokens.has(key)) {
          uniqueTokens.set(key, {
            chain: implementation.chain_id,
            address: tokenInfo.symbol?.toLowerCase() === 'eth' ? 'eth' : implementation.address,
            symbol: tokenInfo.symbol
          });
        }
      });
    });

    try {
      const tokensArray = Array.from(uniqueTokens.values());
      const fetchedPrices = await fetchTokenPrices(API_URL, tokensArray);
      
      // Log the fetched prices for debugging
      console.log('Fetched token prices:', fetchedPrices);
      
      setTokenPrices(fetchedPrices);
      setError(null);
    } catch (err) {
      console.error("Error fetching token prices:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, walletTransactions]);

  useEffect(() => {
    fetchAllTokenPrices();
  }, [fetchAllTokenPrices]);

  return { tokenPrices, isLoading, error };
};

export default useTokenPrices;