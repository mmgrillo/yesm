import { useState, useEffect, useCallback, useRef } from 'react';
import fetchTokenPrices from '../services/tokenPriceService';
import { getSupportedImplementation } from '../utils/tokenUtils';

const useTokenPrices = (API_URL, walletTransactions) => {
  const [tokenPrices, setTokenPrices] = useState({});
  const tokenCache = useRef({}); // Cache to store fetched token prices

  const fetchAllTokenPrices = useCallback(async () => {
    const uniqueTokens = new Set();

    // Collect unique tokens from wallet transactions
    walletTransactions.forEach(transaction => {
      const transfers = transaction.attributes?.transfers || [];
      transfers.forEach(t => {
        const tokenInfo = t.fungible_info;
        const implementation = getSupportedImplementation(tokenInfo);
        if (implementation) {
          const tokenKey = `${implementation.chain_id}:${implementation.address || tokenInfo.symbol}`;
          
          // Only add tokens to uniqueTokens if not already in cache
          if (!tokenCache.current[tokenKey]) {
            uniqueTokens.add(tokenKey);
          }
        }
      });
    });

    if (uniqueTokens.size > 0) {
      // Map tokens to fetch format and fetch only those not in the cache
      const tokensToFetch = Array.from(uniqueTokens).map(key => {
        const [chain, addressOrSymbol] = key.split(':');
        return { chain, address: addressOrSymbol };
      });

      try {
        const fetchedPrices = await fetchTokenPrices(API_URL, tokensToFetch);

        // Update cache and state with newly fetched prices
        const newPrices = {};
        tokensToFetch.forEach((token, index) => {
          const tokenKey = `${token.chain}:${token.address}`;
          const price = fetchedPrices[index]?.price;
          
          if (price !== undefined) {
            newPrices[tokenKey] = price;
            tokenCache.current[tokenKey] = price; // Store in cache
          }
        });

        setTokenPrices(prevPrices => ({ ...prevPrices, ...newPrices }));
      } catch (error) {
        console.error("Error fetching token prices:", error);
      }
    }
  }, [API_URL, walletTransactions]);

  useEffect(() => {
    fetchAllTokenPrices();
  }, [fetchAllTokenPrices]);

  return { tokenPrices };
};

export default useTokenPrices;
