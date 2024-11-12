// src/database/schema.js
const { Pool } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Required for Heroku Postgres
  }
});

// Test the connection before proceeding
const testConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('Successfully connected to database');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

const createTables = async () => {
  if (!await testConnection()) {
    throw new Error('Could not establish database connection');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create market data tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS fear_greed_index (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        value INTEGER NOT NULL,
        classification VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(timestamp)
      );

      CREATE TABLE IF NOT EXISTS m2_supply (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        value DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );

      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        address VARCHAR(42),
        chain VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chain, address)
      );

      CREATE TABLE IF NOT EXISTS token_prices (
        id SERIAL PRIMARY KEY,
        token_id INTEGER REFERENCES tokens(id),
        timestamp BIGINT NOT NULL,
        price DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(token_id, timestamp)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fgi_timestamp ON fear_greed_index(timestamp);
      CREATE INDEX IF NOT EXISTS idx_m2_date ON m2_supply(date);
      CREATE INDEX IF NOT EXISTS idx_token_prices_timestamp ON token_prices(timestamp);
    `);

    await client.query('COMMIT');
    logger.info('Database schema created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  createTables
};