const express = require('express');
const Moralis = require('moralis').default;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const { handleError } = require('./utils/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// Compress all responses
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
});
app.use(limiter);

// Middleware
app.use(express.json());

// API routes (versioned)
const v1TransactionRoutes = require('./api/v1/routes/transactionRoutes');
app.use('/api/v1/transactions', v1TransactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  handleError(err, res);
});

// Start server
const startServer = async () => {
  try {
    // Initialize Moralis
    await Moralis.start({
      apiKey: config.moralisApiKey,
    });

    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
  }
};

startServer();

module.exports = app;