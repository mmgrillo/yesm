const evmService = require('./evmService');
const bitcoinService = require('./bitcoinService');
const solanaService = require('./solanaService');
const logger = require('../utils/logger');

class ChainDetectionService {
  async detectChain(txHash) {
    try {
      logger.debug(`Detecting chain for transaction hash: ${txHash}`);
      
      // Check EVM chains first
      const evmChain = await evmService.checkEVMChains(txHash);
      if (evmChain) {
        logger.info(`Transaction hash ${txHash} detected on EVM chain: ${evmChain}`);
        return evmChain;
      }

      // Check Bitcoin
      if (await bitcoinService.checkBitcoin(txHash)) {
        logger.info(`Transaction hash ${txHash} detected on Bitcoin`);
        return 'bitcoin';
      }

      // Check Solana
      if (await solanaService.checkSolana(txHash)) {
        logger.info(`Transaction hash ${txHash} detected on Solana`);
        return 'solana';
      }

      logger.warn(`Transaction hash ${txHash} does not match any known chain`);
      return 'unknown';
    } catch (error) {
      logger.error(`Error detecting chain for transaction hash ${txHash}: ${error.message}`, {
        stack: error.stack,
        txHash,
        errorDetails: error,
      });
      throw error;
    }
  }

  async fetchTransactionDetails(txHash, chain) {
    switch (chain.toLowerCase()) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
        return evmService.fetchTransactionDetails(txHash, chain);
      case 'bitcoin':
        // Implement the logic if you want to fetch Bitcoin details similarly
        return { message: 'Fetching Bitcoin transaction details not yet implemented' };
      case 'solana':
        // Implement the logic if you want to fetch Solana details similarly
        return { message: 'Fetching Solana transaction details not yet implemented' };
      default:
        throw new Error(`Chain ${chain} is not supported for fetching transaction details.`);
    }
  }
}

module.exports = new ChainDetectionService();
