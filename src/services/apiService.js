const config = require('../utils/config');

const getApiUrlAndKey = (chain) => {
  let apiUrl;
  let apiKey;

  switch (chain.toLowerCase()) {
    case 'ethereum':
      apiUrl = `https://api.etherscan.io/api`;
      apiKey = config.etherscanApiKey;
      break;
    case 'polygon':
      apiUrl = `https://api.polygonscan.com/api`;
      apiKey = config.polygonscanApiKey;
      break;
    case 'arbitrum':
      apiUrl = `https://api.arbiscan.io/api`;
      apiKey = config.arbitrumscanApiKey;
      break;
    case 'optimism':
      apiUrl = `https://api-optimistic.etherscan.io/api`;
      apiKey = config.optimismscanApiKey;
      break;
    case 'base':
      apiUrl = `https://api.basescan.org/api`;
      apiKey = config.basescanApiKey;
      break;
    case 'bsc':
      apiUrl = `https://api.bscscan.com/api`;
      apiKey = config.bscscanApiKey;
      break;
    default:
      throw new Error(`Chain ${chain} is not supported for fetching transaction details.`);
  }

  return { apiUrl, apiKey };
};

module.exports = { getApiUrlAndKey };
