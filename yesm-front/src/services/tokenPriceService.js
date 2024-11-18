import axios from 'axios';

const fetchTokenPrices = async (API_URL, tokens) => {
  if (!tokens.length) return {};

  try {
    const response = await axios.post(`${API_URL}/token-prices`, { tokens });
    return response.data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
};

export default fetchTokenPrices;