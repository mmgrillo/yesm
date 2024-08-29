// src/services/web3Provider.js
const Web3 = require('web3').default;
const config = require('../utils/config');
const logger = require('../utils/logger');

let web3;

const initWeb3 = () => {
  if (!web3) {
    try {
      web3 = new Web3(
        config.infuraProjectId 
          ? `https://mainnet.infura.io/v3/${config.infuraProjectId}`
          : 'https://eth-mainnet.public.blastapi.io'
      );
      logger.info('Web3 initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Web3:', error);
      throw error;
    }
  }
  return web3;
};

module.exports = initWeb3;
