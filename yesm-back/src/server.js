const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - Add this line before other middleware
app.set('trust proxy', 1);

// Enable CORS for your frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
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
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, '../../yesm-front/build')));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    const indexPath = path.join(__dirname, '../../yesm-front/build', 'index.html');
    console.log('Attempting to serve:', indexPath); // Add this for debugging
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('Index file not found at:', indexPath);
      res.status(404).send('Frontend build not found');
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'An error occurred.' });
});

// Start server
const startServer = async () => {
  try {
    const port = process.env.PORT || config.port || 5001;
    
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;