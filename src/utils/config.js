const dotenv = require('dotenv');
const path = require('path');

result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  moralisApiKey: process.env.MORALIS_API_KEY,
  infuraProjectId: process.env.INFURA_PROJECT_ID,
  bitqueryApiKey: process.env.BITQUERY_API_KEY,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // limit each IP to 100 requests per windowMs
};

