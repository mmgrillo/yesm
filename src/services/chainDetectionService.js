// src/services/chainDetectionService.js
const { Moralis, EvmChain } = require('../utils/moralisInit');
const covalentService = require('./covalentService');
const logger = require('../utils/logger');

class ChainDetectionService {
  // Use Moralis to detect the chain of the transaction hash automatically
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
          // Use Moralis to check if the transaction exists on this EVM chain
          const response = await Moralis.EvmApi.transaction.getTransaction({
            transactionHash: txHash,
            chain: chain,
          });

          if (response && response.result) {
            logger.info(`Transaction detected on chain: ${chain.name}`);
            return chain.name.split(' ')[0].toLowerCase(); // Return chain name
          }
        } catch (error) {
          if (error.message.includes('Transaction not found')) {
            continue; // Try the next chain if not found
          }
          throw error;
        }
      }

      logger.warn(`Transaction hash ${txHash} not detected on any EVM chain.`);
      return 'unknown';
    } catch (error) {
      logger.error(`Error detecting chain for transaction hash ${txHash}: ${error.message}`);
      throw error;
    }
  }

  // Fetch transaction details from Covalent after identifying the chain with Moralis
  async fetchTransactionDetails(txHash) {
    try {
      const detectedChain = await this.detectChain(txHash);
  
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
  
      logger.debug(`Fetching transaction details for ${txHash} on chain ${chainId}`);
      
      const transactionDetails = await covalentService.getTransactionDetails(chainId, txHash);
      
      if (!transactionDetails || transactionDetails.length === 0) {
        throw new Error(`Transaction not found on chain ${chainId}`);
      }
  
      const covalentItem = transactionDetails[0];  // Access the first item in the 'items' array
  
      // Check if ERC-20 tokens are transferred
      const erc20Transfers = covalentItem.log_events.filter(event => event.decoded && event.decoded.name === "Transfer");
  
      // Map ERC-20 transfers
      const erc20Details = erc20Transfers.map(transfer => {
        const from = transfer.sender_address;
        const to = transfer.receiver_address;
        const amount = (parseInt(transfer.decoded.params[2].value) / (10 ** transfer.sender_contract_decimals)).toFixed(5); // Convert to human-readable format
        const tokenSymbol = transfer.sender_contract_ticker_symbol;
        const tokenLogo = transfer.sender_logo_url;
  
        return { from, to, amount, tokenSymbol, tokenLogo };
      });
  
      return {
        blockchain: detectedChain,
        status: covalentItem.successful ? 'Success' : 'Failed',
        from: covalentItem.from_address,
        to: covalentItem.to_address,
        amount: erc20Details.length > 0 ? `${erc20Details[0].amount} ${erc20Details[0].tokenSymbol}` : (parseInt(covalentItem.value) / 1e18).toFixed(5),  // Handle ERC-20 transfers if available
        valueWhenTransacted: `$${covalentItem.value_quote.toFixed(2)}`,
        valueToday: 'N/A',  // You can calculate this if needed
        fee: `${(parseInt(covalentItem.fees_paid) / 1e18).toFixed(5)} ETH`,
        confirmations: 'N/A',  // Covalent doesn’t seem to provide confirmations, but you can calculate it
        blockNumber: covalentItem.block_height,
        timestamp: covalentItem.block_signed_at,
        hash: covalentItem.tx_hash,
        erc20Details  // Return ERC-20 details
      };
    } catch (error) {
      logger.error(`Error fetching transaction details: ${error.message}`);
      throw error;
    }
  }
  

  // Fetch wallet transactions from Covalent for a detected chain
  async fetchWalletTransactions(walletAddress) {
    try {
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
        throw new Error(`No transactions found for wallet on chain ${chainId}`);
      }

      return walletTransactions;
    } catch (error) {
      logger.error(`Error fetching wallet transactions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ChainDetectionService();
