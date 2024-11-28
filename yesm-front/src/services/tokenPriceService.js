import axios from 'axios';

const fetchTokenPrices = async (API_URL, tokens) => {
  if (!tokens.length) return {};

  try {
    const response = await axios.post(`${API_URL}/token-prices`, { tokens }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Token price fetch error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error; // Let the hook handle the error
  }
};

export default fetchTokenPrices;