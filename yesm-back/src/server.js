const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./utils/config');
const logger = require('./utils/logger');
const cors = require('cors');
const fs = require('fs');
const priceUpdateJob = require('./jobs/priceUpdateJob');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Enhanced CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yesmother-e680f705d89a.herokuapp.com', 'https://yesmother.herokuapp.com']
  : ['http://localhost:3000', 'http://localhost:5001'];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));

// Initialize price update job in production
if (process.env.NODE_ENV === 'production') {
  const priceJob = new priceUpdateJob();
  priceJob.start().catch(error => {
    logger.error('Price update job error:', error);
  });
}

// API routes with versioning
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/v1', transactionRoutes);
app.use('/api', transactionRoutes);

// Static file serving in production
if (process.env.NODE_ENV === 'production') {
  const possibleBuildPaths = [
    path.join(process.cwd(), '../yesm-front/build'),
    path.join(process.cwd(), 'yesm-front/build'),
    path.join(process.cwd(), 'build'),
    path.join(__dirname, '../../yesm-front/build'),
    path.join(__dirname, '../build'),
    '/app/yesm-front/build',
    '/app/build'
  ];

  const buildPath = possibleBuildPaths.find(p => {
    try {
      return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'));
    } catch (error) {
      logger.error(`Build path validation error: ${error.message}`);
      return false;
    }
  });

  if (buildPath) {
    app.use(express.static(buildPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true
    }));

    app.get('*', (req, res) => {
      const indexPath = path.join(buildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Frontend build not found' });
      }
    });
  }
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'An internal server error occurred',
    status: statusCode,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json(errorResponse);
});

// Server startup
const startServer = async () => {
  const port = process.env.PORT || 5001;
  
  try {
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      logger.info(`CORS enabled for origins: ${corsOrigins.join(', ')}`);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    throw error;
  }
};

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

if (require.main === module) {
  startServer().catch(err => {
    logger.error('Application startup failed:', err);
    setTimeout(() => process.exit(1), 1000);
  });
}

module.exports = app;