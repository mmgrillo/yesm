// Get the preferred token implementation (e.g., prioritizing Ethereum)
export const getSupportedImplementation = (token) => {
  if (!token || !token.implementations) return null; // Ensure token and implementations exist

  // Find Ethereum implementation or fallback to first available implementation
  const ethImplementation = token.implementations.find(
    (impl) => impl.chain_id === 'ethereum'
  );
  return ethImplementation || token.implementations[0];
};


// Extract the price value from the token data, with a fallback
export const findNumberValue = (token) => token?.usd || null;

// Extract the address from token data, with fallbacks
export const findAddressValue = (token) => token?.address || null;
