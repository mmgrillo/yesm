// src/services/chainDetectionService.js
const { Moralis, EvmChain } = require('../utils/moralisInit');
const evmService = require('./evmService');
const bitcoinService = require('./bitcoinService');
const solanaService = require('./solanaService');
const logger = require('../utils/logger');

class ChainDetectionService {
  async detectChain(txHash) {
    try {
      logger.debug(`Detecting chain for transaction hash: ${txHash}`);
      
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
            return chain.name.split(' ')[0].toLowerCase();
          }
        } catch (error) {
          if (error.message.includes('Transaction not found')) {
            continue;
          }
          throw error;
        }
      }

      if (await bitcoinService.checkBitcoin(txHash)) {
        logger.info(`Transaction hash ${txHash} detected on Bitcoin`);
        return 'bitcoin';
      }

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

  async detectChainForWallet(walletAddress) {
    try {
      logger.debug(`Detecting chain for wallet address: ${walletAddress}`);

      const evmChains = [
        EvmChain.ETHEREUM,
        EvmChain.POLYGON,
        EvmChain.ARBITRUM,
        EvmChain.OPTIMISM,
        EvmChain.BSC,
      ];

      for (const chain of evmChains) {
        try {
          const response = await Moralis.EvmApi.account.getTransactions({
            address: walletAddress,
            chain: chain,
          });

          if (response && response.result.length > 0) {
            logger.info(`Wallet address ${walletAddress} detected on EVM chain: ${chain.name}`);
            return chain.name.split(' ')[0].toLowerCase();
          }
        } catch (error) {
          if (error.message.includes('Wallet not found')) {
            continue;
          }
          throw error;
        }
      }

      if (await bitcoinService.checkBitcoinWallet(walletAddress)) {
        logger.info(`Wallet address ${walletAddress} detected on Bitcoin`);
        return 'bitcoin';
      }

      if (await solanaService.checkSolanaWallet(walletAddress)) {
        logger.info(`Wallet address ${walletAddress} detected on Solana`);
        return 'solana';
      }

      logger.warn(`Wallet address ${walletAddress} does not match any known chain`);
      return 'unknown';
    } catch (error) {
      logger.error(`Error detecting chain for wallet address ${walletAddress}: ${error.message}`, {
        stack: error.stack,
        walletAddress,
        errorDetails: error,
      });
      throw error;
    }
  }

  async fetchTransactionDetails(txHash, chain) {
    switch (chain.toLowerCase().trim()) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'bsc':
      case 'base':
        return evmService.fetchTransactionDetails(txHash, chain);
      case 'bitcoin':
        return bitcoinService.fetchTransactionDetails(txHash);
      case 'solana':
        return solanaService.fetchTransactionDetails(txHash);
      default:
        throw new Error(`Chain ${chain} is not supported for fetching transaction details.`);
    }
  }

  async fetchWalletTransactions(walletAddress, chain) {
    switch (chain.toLowerCase().trim()) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'bsc':
      case 'base':
        return evmService.fetchWalletTransactions(walletAddress, chain);
      case 'bitcoin':
        return bitcoinService.fetchWalletTransactions(walletAddress);
      case 'solana':
        return solanaService.fetchWalletTransactions(walletAddress);
      default:
        throw new Error(`Chain ${chain} is not supported for fetching wallet transactions.`);
    }
  }
}

module.exports = new ChainDetectionService();
