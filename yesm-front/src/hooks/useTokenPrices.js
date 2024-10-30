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
            uniqueTokens.add({ chain: implementation.chain_id, address: implementation.address || tokenInfo.symbol });
          }
        }
      });
    });

    if (uniqueTokens.size > 0) {
      try {
        // Fetch prices for all unique tokens in a single POST request
        const fetchedPrices = await fetchTokenPrices(API_URL, Array.from(uniqueTokens));

        // Check if fetchedPrices is an object
        if (typeof fetchedPrices === 'object' && fetchedPrices !== null) {
          const newPrices = {};
          Object.entries(fetchedPrices).forEach(([key, { symbol, usd }]) => {
            if (symbol && usd) {
              newPrices[key] = usd;
              tokenCache.current[key] = usd; // Cache the price
            }
          });

          setTokenPrices(prevPrices => ({ ...prevPrices, ...newPrices }));
        } else {
          console.error("Expected fetchedPrices to be an object, but got:", fetchedPrices);
        }

        // Log fetchedPrices within the function scope
        console.log("Fetched token prices:", fetchedPrices);

      } catch (error) {
        console.error("Error fetching token prices:", error);
      }
    }
  }, [API_URL, walletTransactions]);

  useEffect(() => {
    fetchAllTokenPrices();
  }, [fetchAllTokenPrices]);

  console.log("Current token prices state:", tokenPrices);

  return { tokenPrices };
};

export default useTokenPrices;
