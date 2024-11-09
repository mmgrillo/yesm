const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const cors = require('cors');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - Add this line before other middleware
app.set('trust proxy', 1);

// CORS configuration based on environment
const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || 'https://yesmother-fdd566b04a1.herokuapp.com'
  : 'http://localhost:3000';

logger.info('CORS Origin:', corsOrigin);
logger.info('Environment:', process.env.NODE_ENV);
logger.info('Current directory:', process.cwd());

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 15 * 60 * 1000,
  max: config.rateLimitMax || 100
});
app.use(limiter);

// Middleware
app.use(express.json());

// API routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api', transactionRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  logger.info('Setting up production static file serving');
  
  // Define build paths
  const buildPath = '/app/build';  // Heroku absolute path
  const indexPath = path.join(buildPath, 'index.html');
  
  logger.info('Build path:', buildPath);
  logger.info('Index path:', indexPath);

  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    logger.info('Build directory found. Contents:', fs.readdirSync(buildPath));
  } else {
    logger.warn('Build directory not found at:', buildPath);
  }

  // Serve static files from the React build
  app.use(express.static(buildPath));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    logger.info('Handling request for:', req.path);
    logger.info('Attempting to serve index.html from:', indexPath);

    if (fs.existsSync(indexPath)) {
      logger.info('index.html found, serving file');
      res.sendFile(indexPath);
    } else {
      logger.error('index.html not found. Current directory contents:', fs.readdirSync(process.cwd()));
      res.status(404).send('Frontend build not found');
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'An error occurred.' });
});

// Start server
const startServer = async () => {
  try {
    const port = process.env.PORT || config.port || 5001;
    
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      logger.info(`CORS origin set to: ${corsOrigin}`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

// Add process error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = app;