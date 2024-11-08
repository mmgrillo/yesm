const dotenv = require('dotenv');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for your frontend
app.use(cors({
  // Update CORS to handle both local and production URLs
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL  // You'll set this in Heroku config vars
    : 'http://localhost:3000',
  credentials: true
}));

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
});
app.use(limiter);

// Middleware
app.use(express.json());

// API routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'An error occurred.' });
});

// Start server
const startServer = async () => {
  try {
    // Use Heroku's dynamic port or fallback to config
    const port = process.env.PORT || config.port || 5001;
    
    app.listen(port, '0.0.0.0', () => {  // Added host binding for Heroku
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
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