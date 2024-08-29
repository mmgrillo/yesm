// src/utils/CustomError.js
class CustomError extends Error {
  constructor(message, statusCode, context) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
