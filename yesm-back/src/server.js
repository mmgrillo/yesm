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

// Trust proxy
app.set('trust proxy', 1);

// CORS configuration based on environment
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://yesmother-e680f705d89a.herokuapp.com',
      'https://yesmother.herokuapp.com'
    ]
  : ['http://localhost:3000'];

logger.info('Starting server configuration...');
logger.info('CORS Origin:', corsOrigin);
logger.info('Environment:', process.env.NODE_ENV);
logger.info('Current directory:', process.cwd());
logger.info('Directory contents:', fs.readdirSync(process.cwd()));

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
  
  // Define possible build paths relative to the current directory
  const possibleBuildPaths = [
    path.join(process.cwd(), '../yesm-front/build'),  // From yesm-back/src to yesm-front/build
    path.join(process.cwd(), 'yesm-front/build'),     // From root to yesm-front/build
    path.join(process.cwd(), 'build'),                // Direct build folder
    path.join(__dirname, '../../yesm-front/build'),   // From src to yesm-front/build
    path.join(__dirname, '../build'),                 // One level up build
    '/app/yesm-front/build',                         // Heroku absolute paths
    '/app/build'                                     // Heroku absolute paths
  ];

  logger.info('Checking possible build paths:');
  possibleBuildPaths.forEach(buildPath => {
    try {
      logger.info(`Checking ${buildPath}:`, fs.existsSync(buildPath) ? 'EXISTS' : 'NOT FOUND');
      if (fs.existsSync(buildPath)) {
        logger.info(`Contents of ${buildPath}:`, fs.readdirSync(buildPath));
      }
    } catch (error) {
      logger.error(`Error checking path ${buildPath}:`, error.message);
    }
  });

  // Find the first valid build path that contains index.html
  const buildPath = possibleBuildPaths.find(p => {
    try {
      return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'));
    } catch (error) {
      logger.error(`Error validating path ${p}:`, error.message);
      return false;
    }
  });

  if (!buildPath) {
    logger.error('No valid build path found with index.html');
    logger.error('Current directory structure:', JSON.stringify(listDirectoryContents(process.cwd()), null, 2));
  } else {
    logger.info('Using build path:', buildPath);
    
    // Serve static files from the React build
    app.use(express.static(buildPath));

    // Handle React routing, return all requests to React app
    app.get('*', function(req, res) {
      const indexPath = path.join(buildPath, 'index.html');
      logger.info('Request path:', req.path);
      logger.info('Serving index.html from:', indexPath);

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        logger.error('index.html not found in build directory');
        res.status(404).send('Frontend build not found');
      }
    });
  }
} else {
  logger.info('Server running in development mode');
}

// Helper function to recursively list directory contents
function listDirectoryContents(dir, depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return '[max depth reached]';
  try {
    const items = fs.readdirSync(dir);
    const contents = {};
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        contents[item] = listDirectoryContents(fullPath, depth + 1, maxDepth);
      } else {
        contents[item] = 'file';
      }
    });
    return contents;
  } catch (error) {
    return `[error: ${error.message}]`;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'An error occurred.' });
});

// Start server
const startServer = async () => {
  try {
    // Use Heroku's provided port or fallback to default
    const port = process.env.PORT || 5001;
    
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      logger.info('Current directory:', process.cwd());
      logger.info('Node version:', process.version);
      logger.info('Memory usage:', process.memoryUsage());
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    // Don't exit process on error, let Heroku handle restarts
    throw error;
  }
};
// Proper error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Give the logger time to write
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit here, just log
});

// Start server only if this file is run directly
if (require.main === module) {
  startServer().catch(err => {
    logger.error('Failed to start application:', err);
    // Give the logger time to write
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

module.exports = app;