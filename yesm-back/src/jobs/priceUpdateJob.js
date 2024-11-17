// src/jobs/priceUpdateJob.js
const TokenPricePopulationService = require('../scripts/populateTokenPrices');
const PriceValidation = require('../validation/priceValidation');
const logger = require('../utils/logger');

class PriceUpdateJob {
  constructor() {
    this.priceService = new TokenPricePopulationService();
    this.isRunning = false;
    this.updateInterval = null;
  }

  async updatePrices() {
    if (this.isRunning) {
      logger.info('Price update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    try {
      await this.priceService.populateTokenPrices();
      logger.info('Price update completed successfully');
    } catch (error) {
      logger.error('Price update failed:', error);
      // Don't throw the error, just log it
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    return new Promise((resolve) => {
      logger.info('Starting price update job');
      
      // Initial update
      this.updatePrices().catch(error => {
        logger.error('Initial price update failed:', error);
      });

      // Set up interval (every 5 minutes)
      this.updateInterval = setInterval(() => {
        this.updatePrices().catch(error => {
          logger.error('Scheduled price update failed:', error);
        });
      }, 5 * 60 * 1000);

      logger.info('Price update job started successfully');
      resolve();
    });
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info('Price update job stopped');
  }
}

module.exports = PriceUpdateJob;