const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');
const axios = require('axios');
const Web3 = require('web3');
const config = require('../utils/config');

class ChainDetectionService {
  constructor() {
    this.initializeMoralis();
    this.initializeInfura();
  }

  async initializeMoralis() {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
    });
  }

  initializeInfura() {
    this.infuraEndpoints = {
      ethereum: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      polygon: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      optimism: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      arbitrum: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    };
  }

  async detectChain(txHash) {
    // Check EVM chains first using Moralis
    const evmChain = await this.checkEVMChains(txHash);
    if (evmChain) {
      return evmChain;
    }

    // If Moralis fails, try Infura
    const infuraChain = await this.checkInfuraChains(txHash);
    if (infuraChain) {
      return infuraChain;
    }

    // Check Bitcoin
    if (await this.checkBitcoin(txHash)) {
      return 'bitcoin';
    }

    // Check Solana
    if (await this.checkSolana(txHash)) {
      return 'solana';
    }

    return 'unknown';
  }

  async checkEVMChains(txHash) {
    try {
      const chains = [
        EvmChain.ETHEREUM,
        EvmChain.POLYGON,
        EvmChain.ARBITRUM,
        EvmChain.OPTIMISM,
        EvmChain.BASE
      ];

      for (const chain of chains) {
        try {
          const response = await Moralis.EvmApi.transaction.getTransaction({
            transactionHash: txHash,
            chain
          });

          if (response && response.result) {
            return chain.name;
          }
        } catch (error) {
          // If transaction is not found on this chain, continue to the next
          if (error.message.includes('Transaction not found')) {
            continue;
          }
          throw error;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking EVM chains with Moralis:', error.message);
      return null;
    }
  }

  async checkInfuraChains(txHash) {
    for (const [chain, endpoint] of Object.entries(this.infuraEndpoints)) {
      try {
        const web3 = new Web3(new Web3.providers.HttpProvider(endpoint));
        const transaction = await web3.eth.getTransaction(txHash);
        
        if (transaction) {
          return chain;
        }
      } catch (error) {
        console.error(`Error checking ${chain} with Infura:`, error.message);
      }
    }
    return null;
  }

  async checkBitcoin(txHash) {
    try {
      const query = `
        query {
          bitcoin {
            transactions(txHash: {is: "${txHash}"}) {
              txHash
            }
          }
        }
      `;

      const response = await axios.post('https://graphql.bitquery.io', 
        { query },
        { headers: { 'X-API-KEY': process.env.BITQUERY_API_KEY } }
      );

      return response.data.data.bitcoin.transactions.length > 0;
    } catch (error) {
      console.error('Error checking Bitcoin:', error.message);
      return false;
    }
  }

  async checkSolana(txHash) {
    try {
      const response = await axios.post('https://api.mainnet-beta.solana.com', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          txHash,
          'json'
        ]
      });

      return response.data.result !== null;
    } catch (error) {
      console.error('Error checking Solana:', error.message);
      return false;
    }
  }
}

module.exports = new ChainDetectionService();