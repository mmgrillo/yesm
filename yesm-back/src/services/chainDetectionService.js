const { Moralis, EvmChain } = require('../utils/moralisInit');
const evmService = require('./evmService');
const bitcoinService = require('./bitcoinService');
const solanaService = require('./solanaService');
const logger = require('../utils/logger');

class ChainDetectionService {
  async detectChain(txHash) {
    try {
      logger.debug(`Detecting chain for transaction hash: ${txHash}`);

      // Check EVM chains first using Moralis
      const evmChains = [
        EvmChain.ETHEREUM,
        EvmChain.POLYGON,
        EvmChain.ARBITRUM,
        EvmChain.OPTIMISM,
        EvmChain.BSC,
      ];

      for (const chain of evmChains) {
        try {
          const response = await Moralis.EvmApi.transaction.getTransaction({
            transactionHash: txHash,
            chain: chain,
          });

          if (response && response.result) {
            logger.info(`Transaction hash ${txHash} detected on EVM chain: ${chain.name}`);
            return chain.name.split(' ')[0].toLowerCase(); // This will return 'ethereum' for 'Ethereum Mainnet'
          }
        } catch (error) {
          if (error.message.includes('Transaction not found')) {
            continue; // Try the next chain
          }
          throw error;
        }
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
    const normalizedChain = chain.toLowerCase().trim();
    switch (normalizedChain) {
      case 'ethereum':
      case 'ethereum mainnet':
        return evmService.fetchTransactionDetails(txHash, 'ethereum');
      case 'polygon':
        return evmService.fetchTransactionDetails(txHash, 'polygon');
      case 'arbitrum':
        return evmService.fetchTransactionDetails(txHash, 'arbitrum');
      case 'optimism':
        return evmService.fetchTransactionDetails(txHash, 'optimism');
      case 'bsc':
      case 'binance smart chain':
        return evmService.fetchTransactionDetails(txHash, 'bsc');
      case 'base':
        return evmService.fetchTransactionDetails(txHash, 'base');
      case 'bitcoin':
        return bitcoinService.fetchTransactionDetails(txHash);
      case 'solana':
        return solanaService.fetchTransactionDetails(txHash);
      default:
        throw new Error(`Chain ${chain} is not supported for fetching transaction details.`);
    }
  }
}

module.exports = new ChainDetectionService();
