const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');
const config = require('./config');
const logger = require('./logger');

let isInitialized = false;

const initializeMoralis = async () => {
  if (!isInitialized) {
    try {
      await Moralis.start({
        apiKey: config.moralisApiKey,
      });
      isInitialized = true;
      logger.info('Moralis initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Moralis:', error);
      throw error;
    }
  }
  return Moralis;
};

module.exports = { initializeMoralis, Moralis, EvmChain };