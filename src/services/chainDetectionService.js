const { Moralis, EvmChain } = require('../utils/moralisInit');
const covalentService = require('./covalentService');
const logger = require('../utils/logger');

class ChainDetectionService {
  // Use Moralis to detect the chain of the wallet
  async detectChainForWallet(walletAddress) {
    try {
      logger.debug(`Detecting chain for wallet address: ${walletAddress}`);
      const evmChains = [
        EvmChain.ETHEREUM,
        EvmChain.POLYGON,
        EvmChain.ARBITRUM,
        EvmChain.OPTIMISM,
        EvmChain.BSC,
        EvmChain.BASE,
      ];

      for (const chain of evmChains) {
        try {
          const response = await Moralis.EvmApi.account.getTransactions({
            address: walletAddress,
            chain: chain,
          });

          if (response && response.result && response.result.length > 0) {
            logger.info(`Transactions detected on chain: ${chain.name}`);
            return chain.name.split(' ')[0].toLowerCase(); // Return detected chain name
          }
        } catch (error) {
          continue;
        }
      }

      logger.warn(`No transactions found for wallet ${walletAddress} on any EVM chain.`);
      return 'unknown';
    } catch (error) {
      logger.error(`Error detecting chain for wallet address ${walletAddress}: ${error.message}`);
      throw error;
    }
  }

  // Fetch wallet transactions after detecting chain
  async fetchWalletTransactions(walletAddress) {
    const detectedChain = await this.detectChainForWallet(walletAddress);

    const chainMap = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      bsc: 56,
      base: 8453,
    };

    const chainId = chainMap[detectedChain];
    if (!chainId) {
      throw new Error(`Unsupported chain: ${detectedChain}`);
    }

    logger.debug(`Fetching wallet transactions for ${walletAddress} on chain ${chainId}`);

    const walletTransactions = await covalentService.getERCTransfers(chainId, walletAddress);
    if (!walletTransactions || walletTransactions.length === 0) {
      throw new Error(`No transactions found for wallet ${walletAddress} on chain ${chainId}`);
    }

    return walletTransactions;
  }
}

module.exports = new ChainDetectionService();
