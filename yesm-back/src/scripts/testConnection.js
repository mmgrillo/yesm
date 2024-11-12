const { Pool } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config();

const testDatabaseConnection = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    logger.info('Attempting to connect to database...');
    logger.info('Database URL format:', process.env.DATABASE_URL ? 'URL is present' : 'URL is missing');
    
    const client = await pool.connect();
    logger.info('Successfully connected to database');
    
    const result = await client.query('SELECT current_timestamp');
    logger.info('Test query successful:', result.rows[0]);
    
    client.release();
    logger.info('Connection test completed successfully');
  } catch (error) {
    logger.error('Database connection test failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  testDatabaseConnection();
}