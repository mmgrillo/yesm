const dotenv = require('dotenv');
const express = require('express');
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

// API routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  handleError(err, res);
});

// Start server
const startServer = async () => {
  try {
    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;