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

    // Create tables
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
        timestamp TIMESTAMPTZ NOT NULL,
        price DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(token_id, timestamp)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fgi_timestamp ON fear_greed_index(timestamp);
      CREATE INDEX IF NOT EXISTS idx_m2_date ON m2_supply(date);
      CREATE INDEX IF NOT EXISTS idx_token_prices_lookup ON token_prices(token_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_token_prices_recent ON token_prices(timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_token_prices_recent_lookup 
      ON token_prices(token_id, timestamp DESC) 
      WHERE timestamp > NOW() - INTERVAL '7 days';
    `);

    // Create helper functions
    await client.query(`
      CREATE OR REPLACE FUNCTION get_hourly_prices(
        p_token_id INTEGER,
        p_start_time TIMESTAMP,
        p_end_time TIMESTAMP
      ) 
      RETURNS TABLE (
        hour TIMESTAMP,
        open_price DECIMAL,
        high_price DECIMAL,
        low_price DECIMAL,
        close_price DECIMAL,
        average_price DECIMAL,
        volume DECIMAL
      ) 
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          date_trunc('hour', timestamp) as hour,
          FIRST_VALUE(price) OVER (PARTITION BY date_trunc('hour', timestamp) ORDER BY timestamp) as open_price,
          MAX(price) as high_price,
          MIN(price) as low_price,
          LAST_VALUE(price) OVER (PARTITION BY date_trunc('hour', timestamp) ORDER BY timestamp RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as close_price,
          AVG(price) as average_price,
          SUM(COALESCE(volume, 0)) as volume
        FROM token_prices
        WHERE token_id = p_token_id
          AND timestamp BETWEEN p_start_time AND p_end_time
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY hour;
      END;
      $$;
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION get_daily_prices(
        p_token_id INTEGER,
        p_start_date DATE,
        p_end_date DATE
      ) 
      RETURNS TABLE (
        date DATE,
        open_price DECIMAL,
        high_price DECIMAL,
        low_price DECIMAL,
        close_price DECIMAL,
        average_price DECIMAL,
        volume DECIMAL
      ) 
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          date_trunc('day', timestamp)::date as date,
          FIRST_VALUE(price) OVER (PARTITION BY date_trunc('day', timestamp) ORDER BY timestamp) as open_price,
          MAX(price) as high_price,
          MIN(price) as low_price,
          LAST_VALUE(price) OVER (PARTITION BY date_trunc('day', timestamp) ORDER BY timestamp RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as close_price,
          AVG(price) as average_price,
          SUM(COALESCE(volume, 0)) as volume
        FROM token_prices
        WHERE token_id = p_token_id
          AND timestamp::date BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc('day', timestamp)
        ORDER BY date;
      END;
      $$;
    `);

    // Create cleanup function
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_prices()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        DELETE FROM token_prices
        WHERE timestamp < NOW() - INTERVAL '30 days';
        RETURN NULL;
      END;
      $$;
    `);

    // Create cleanup trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_cleanup_prices ON token_prices;
      
      CREATE TRIGGER trigger_cleanup_prices
        AFTER INSERT ON token_prices
        FOR EACH STATEMENT
        WHEN (pg_trigger_depth() = 0)
        EXECUTE FUNCTION cleanup_old_prices();
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