const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');
const logger = require('../utils/logger');
const config = require('../utils/config');

class EVMService {
  constructor() {
    this.initializeMoralis();
  }

  async initializeMoralis() {
    try {
      if (!config.moralisApiKey) {
        throw new Error('Moralis API key is not set');
      }
      await Moralis.start({
        apiKey: config.moralisApiKey,
      });
      logger.info('Moralis initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Moralis:', error);
      throw error;
    }
  }

  async checkEVMChains(txHash) {
    try {
      const chains = [
        EvmChain.ETHEREUM,
        EvmChain.POLYGON,
        EvmChain.ARBITRUM,
        EvmChain.OPTIMISM,
      ];

      for (const chain of chains) {
        try {
          const response = await Moralis.EvmApi.transaction.getTransaction({
            transactionHash: txHash,
            chain,
          });

          if (response && response.result) {
            logger.debug(`Transaction found on EVM chain: ${chain.name}`);
            return chain.name;
          }
        } catch (error) {
          if (error.message.includes('Transaction not found')) {
            logger.debug(`Transaction not found on EVM chain: ${chain.name}`);
            continue; // Try the next chain
          }
          throw error;
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error checking EVM chains with Moralis: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return null;
    }
  }

  async fetchTransactionDetails(txHash, chain) {
    try {
      const response = await Moralis.EvmApi.transaction.getTransaction({
        transactionHash: txHash,
        chain,
      });

      if (response && response.result) {
        logger.debug(`Fetched transaction details on ${chain} for hash: ${txHash}`);
        return response.result;
      } else {
        throw new Error(`Transaction not found on ${chain}`);
      }
    } catch (error) {
      logger.error(`Error fetching ${chain} transaction details: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      return null;
    }
  }
}

module.exports = new EVMService();
