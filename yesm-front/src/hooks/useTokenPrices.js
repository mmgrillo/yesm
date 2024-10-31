import { useState, useEffect, useCallback, useRef } from 'react';
import fetchTokenPrices from '../services/tokenPriceService';
import { getSupportedImplementation } from '../utils/tokenUtils';

const useTokenPrices = (API_URL, walletTransactions) => {
  const [tokenPrices, setTokenPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const tokenCache = useRef({}); // Cache to store fetched token prices

  const fetchAllTokenPrices = useCallback(async () => {
    const uniqueTokens = new Set();

    // Collect unique tokens from wallet transactions
    walletTransactions.forEach(transaction => {
      const transfers = transaction.attributes?.transfers || [];
      transfers.forEach(transfer => {
        const tokenInfo = transfer.fungible_info;
        const implementation = getSupportedImplementation(tokenInfo);

        if (implementation) {
          let tokenKey;
          if (tokenInfo.symbol.toLowerCase() === 'eth' && implementation.chain_id === 'ethereum') {
            // Special handling for ETH
            tokenKey = 'ethereum:eth';
          } else {
            // Standard handling for tokens with contract addresses
            tokenKey = `${implementation.chain_id}:${implementation.address || tokenInfo.symbol}`;
          }

          // Check if the token is already cached to avoid re-fetching
          if (!tokenCache.current[tokenKey]) {
            tokenCache.current[tokenKey] = true; // Mark this token as cached
            uniqueTokens.add({
              chain: implementation.chain_id,
              address: tokenInfo.symbol.toLowerCase() === 'eth' ? 'eth' : implementation.address,
              symbol: tokenInfo.symbol,
            });
          }
        }
      });
    });

    if (uniqueTokens.size > 0) {
      try {
        // Convert the Set to an array and fetch prices
        const tokensArray = Array.from(uniqueTokens);
        const fetchedPrices = await fetchTokenPrices(API_URL, tokensArray);

        // Update the token cache and state with the new prices
        Object.entries(fetchedPrices).forEach(([key, value]) => {
          tokenCache.current[key] = true; // Ensure it is marked as cached
          setTokenPrices(prevPrices => ({ ...prevPrices, [key]: value }));
        });
      } catch (err) {
        console.error("Error fetching token prices:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false); // No tokens to fetch, mark as not loading
    }
  }, [API_URL, walletTransactions]);

  useEffect(() => {
    if (walletTransactions?.length > 0) {
      fetchAllTokenPrices();
    }
  }, [fetchAllTokenPrices, walletTransactions]);

  return { tokenPrices, isLoading, error };
};

export default useTokenPrices;
