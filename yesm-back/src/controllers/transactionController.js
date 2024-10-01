const axios = require('axios');

exports.getWalletTransactions = async (req, res) => {
  const { walletAddress } = req.params;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  const ZERION_API_URL = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions`;
  const ZERION_API_KEY = process.env.ZERION_API_KEY;

  try {
    const encodedApiKey = Buffer.from(`${ZERION_API_KEY}:`).toString('base64');
    const response = await axios.get(ZERION_API_URL, {
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${encodedApiKey}`,
      },
    });

    if (!response.data || !response.data.data) {
      return res.status(404).json({ error: 'No transactions found for this wallet.' });
    }

    res.json(response.data.data);  // Ensure we're sending the correct data to the frontend
  } catch (error) {
    console.error('Error fetching wallet transactions:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to fetch wallet transactions.' });
  }
};
