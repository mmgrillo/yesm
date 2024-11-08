// tokenPriceService.js (frontend)
import axios from 'axios';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const fetchTokenPrices = async (API_URL, tokens) => {
  const now = Date.now();
  const cachedData = JSON.parse(localStorage.getItem('tokenPricesCache')) || {};
  const prices = {};
  const tokensToFetch = [];

  // Check which tokens need to be fetched
  tokens.forEach(token => {
    const key = token.symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' : `${token.chain}:${token.address}`;
    const cached = cachedData[key];
    
    // Use cached price if it exists and hasn't expired
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      prices[key] = cached.price;
    } else {
      tokensToFetch.push(token);
    }
  });

  // If all tokens were cached, return immediately
  if (tokensToFetch.length === 0) {
    return prices;
  }

  try {
    const response = await axios.post(`${API_URL}/api/token-prices`, { tokens: tokensToFetch });
    
    // Store new prices in cache and add to result
    Object.entries(response.data).forEach(([key, value]) => {
      // Add timestamp to cache entry
      cachedData[key] = {
        price: value,
        timestamp: now
      };
      prices[key] = value;
    });

    // Update localStorage with new cache data
    localStorage.setItem('tokenPricesCache', JSON.stringify(cachedData));

    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    // Return any cached prices we have even if the fetch failed
    return prices;
  }
};

export default fetchTokenPrices;