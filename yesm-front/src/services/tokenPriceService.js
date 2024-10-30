import axios from 'axios';

const fetchTokenPrices = async (API_URL, contractAddresses) => {
  const prices = {};

  for (const token of contractAddresses) {
    const { chain, address } = token;
    if (!chain || !address) continue;

    try {
      const apiUrl = `${API_URL}/api/token-prices/${address}`;
      const response = await axios.get(apiUrl);
      prices[`${chain}:${address}`] = response.data.price;
    } catch (error) {
      console.error(`Error fetching price for ${address}:`, error.message);
    }
  }

  return prices;
};

export default fetchTokenPrices;
