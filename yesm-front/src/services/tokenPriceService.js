import axios from 'axios';

const fetchTokenPrices = async (API_URL, contractAddresses) => {
  const prices = {};
  const cachedPrices = JSON.parse(sessionStorage.getItem('tokenPricesCache')) || {};

  const tokensToFetch = contractAddresses.filter(token => {
    const key = `${token.chain}:${token.address}`;
    return !cachedPrices[key];
  });

  if (tokensToFetch.length === 0) {
    // If all tokens are cached, return cached prices
    return cachedPrices;
  }

  try {
    // Make a single POST request with tokens to fetch
    const apiUrl = `${API_URL}/api/token-prices`;
    const response = await axios.post(apiUrl, { tokens: tokensToFetch });

    // Process the prices and store them in session cache
    Object.keys(response.data).forEach((key) => {
      prices[key] = response.data[key];
      cachedPrices[key] = response.data[key];
    });

    // Update the session cache
    sessionStorage.setItem('tokenPricesCache', JSON.stringify(cachedPrices));
  } catch (error) {
    console.error('Error fetching token prices:', error.message);
  }

  return { ...cachedPrices, ...prices };
};

export default fetchTokenPrices;
