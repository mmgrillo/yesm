// Get the preferred token implementation with enhanced handling for ETH and other tokens
export const getSupportedImplementation = (tokenInfo) => {
  if (!tokenInfo) return null;

  // Special handling for ETH
  if (tokenInfo.symbol?.toUpperCase() === 'ETH') {
    return {
      chain_id: 'ethereum',
      address: tokenInfo.address || 'eth',
      symbol: 'ETH'
    };
  }

  // Handle case where token info is provided directly without implementations
  if (!tokenInfo.implementations && tokenInfo.chain_id) {
    return {
      chain_id: tokenInfo.chain_id,
      address: tokenInfo.address,
      symbol: tokenInfo.symbol
    };
  }

  // Original implementation handling
  if (!tokenInfo.implementations?.length) return null;

  // Find Ethereum implementation or fallback to first available implementation
  const ethImplementation = tokenInfo.implementations.find(
    (impl) => impl.chain_id === 'ethereum'
  );
  return ethImplementation || tokenInfo.implementations[0];
};

// Extract the price value from the token data, with enhanced fallback handling
export const findNumberValue = (token) => {
  if (!token) return null;
  
  // Handle different price data structures
  const price = token.usd || token.price?.value || token.value;
  return typeof price === 'number' ? price : null;
};

// Extract the address from token data, with enhanced fallback handling
export const findAddressValue = (token) => {
  if (!token) return null;
  
  // Handle different address formats and locations
  const address = token.address || 
                 token.implementation?.address || 
                 (token.implementations?.[0]?.address);
                 
  return address || null;
};

// New helper function to get price key for token
export const getPriceKey = (tokenInfo) => {
  const implementation = getSupportedImplementation(tokenInfo);
  if (!implementation) return null;
  
  return `${implementation.chain_id}:${implementation.address || tokenInfo.symbol}`;
};