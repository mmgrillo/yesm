import { useState, useEffect, useCallback } from 'react';
import fetchTokenPrices from '../services/tokenPriceService';
import { getSupportedImplementation } from '../utils/tokenUtils';

const useTokenPrices = (API_URL, walletTransactions) => {
  const [tokenPrices, setTokenPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllTokenPrices = useCallback(async () => {
    console.log('useTokenPrices called with:', {
      hasAPIURL: !!API_URL,
      transactions: walletTransactions,
      transactionsLength: walletTransactions?.length,
    });

    if (!walletTransactions?.length) {
      console.log('No transactions available yet');
      return;
    }
    
    setIsLoading(true);
    const uniqueTokens = new Map();

    console.log('Processing transactions:', walletTransactions.slice(0, 2)); // Log first 2 transactions for debugging

    walletTransactions.forEach(transaction => {
      console.log('Processing transaction:', {
        hasAttributes: !!transaction.attributes,
        transfersLength: transaction.attributes?.transfers?.length
      });

      const transfers = transaction.attributes?.transfers || [];
      transfers.forEach(transfer => {
        const tokenInfo = transfer.fungible_info;
        console.log('Processing transfer:', {
          hasTokenInfo: !!tokenInfo,
          symbol: tokenInfo?.symbol,
          implementations: tokenInfo?.implementations
        });

        if (!tokenInfo) return;
        
        const implementation = getSupportedImplementation(tokenInfo);
        if (!implementation) {
          console.log('No supported implementation found for token:', tokenInfo);
          return;
        }

        const key = tokenInfo.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' 
          : `${implementation.chain_id}:${implementation.address}`;
        
        if (!uniqueTokens.has(key)) {
          uniqueTokens.set(key, {
            chain: implementation.chain_id,
            address: tokenInfo.symbol?.toLowerCase() === 'eth' ? 'eth' : implementation.address,
            symbol: tokenInfo.symbol
          });
        }
      });
    });

    console.log('Unique tokens found:', Array.from(uniqueTokens.values()));

    try {
      const tokensArray = Array.from(uniqueTokens.values());
      console.log('Fetching prices for tokens:', tokensArray);
      
      const fetchedPrices = await fetchTokenPrices(API_URL, tokensArray);
      console.log('Fetched token prices:', fetchedPrices);
      
      setTokenPrices(fetchedPrices);
      setError(null);
    } catch (err) {
      console.error('Error fetching token prices:', err);
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