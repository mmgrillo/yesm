import axios from 'axios';

const fetchTokenPrices = async (API_URL, tokens) => {
  const cachedPrices = JSON.parse(sessionStorage.getItem('tokenPricesCache')) || {};

  // Filter out tokens that are already cached
  const tokensToFetch = tokens.filter(token => {
    const key = token.symbol.toLowerCase() === 'eth' ? 'ethereum:eth' : `${token.chain}:${token.address}`;
    return !cachedPrices[key];
  });

  if (tokensToFetch.length === 0) {
    return cachedPrices; // All tokens are cached
  }

  try {
    const apiUrl = `${API_URL}/api/token-prices`;
    const response = await axios.post(apiUrl, { tokens: tokensToFetch });

    // Update cache with newly fetched prices
    Object.keys(response.data).forEach(key => {
      cachedPrices[key] = response.data[key];
    });

    // Store the updated cache in session storage
    sessionStorage.setItem('tokenPricesCache', JSON.stringify(cachedPrices));

    return cachedPrices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    throw error;
  }
};

export default fetchTokenPrices;
