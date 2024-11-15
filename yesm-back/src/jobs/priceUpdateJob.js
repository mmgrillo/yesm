// src/jobs/priceUpdateJob.js
const TokenPricePopulationService = require('../scripts/populateTokenPrices');
const PriceValidation = require('../validation/priceValidation');
const logger = require('../utils/logger');

class PriceUpdateJob {
  constructor() {
    this.priceService = new TokenPricePopulationService();
    this.isRunning = false;
  }

  async updateAndValidatePrices() {
    if (this.isRunning) {
      logger.info('Price update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    try {
      // First update prices
      await this.priceService.populateTokenPrices();

      // Then validate the new data
      const validationResults = await PriceValidation.runFullValidation();
      
      if (validationResults.hasIssues) {
        logger.warn('Price validation found issues:', validationResults);
        
        // Optional: Check completeness of recent data
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const completeness = await PriceValidation.checkDataCompleteness(lastHour, new Date());
        
        if (completeness.overallCompleteness < 95) {
          logger.error('Recent data completeness below threshold:', completeness);
          // You might want to trigger a re-fetch of data here
        }
      }

    } catch (error) {
      logger.error('Price update and validation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    // Run every 5 minutes
    setInterval(() => {
      this.updateAndValidatePrices().catch(error => {
        logger.error('Price update job failed:', error);
      });
    }, 5 * 60 * 1000);

    // Run once at startup
    this.updateAndValidatePrices().catch(error => {
      logger.error('Initial price update failed:', error);
    });
  }
}

module.exports = new PriceUpdateJob();