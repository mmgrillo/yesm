const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, res) => {
  const { statusCode, message } = err;
  logger.error(`${statusCode || 500} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(statusCode || 500).json({
    status: 'error',
    statusCode: statusCode || 500,
    message: statusCode === 500 ? 'Internal server error' : message
  });
};

module.exports = {
  AppError,
  handleError
};