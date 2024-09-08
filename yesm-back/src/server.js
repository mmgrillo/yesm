// src/server.js
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const { initializeMoralis } = require('./utils/moralisInit');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(cors());

// API routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'An error occurred.' });
});

// Start server
const startServer = async () => {
  try {
    await initializeMoralis();
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
