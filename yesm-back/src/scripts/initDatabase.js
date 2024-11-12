// src/scripts/initDatabase.js
const { createTables } = require('../database/schema');
const logger = require('../utils/logger');

const initializeDatabase = async () => {
  try {
    logger.info('Starting database initialization...');
    await createTables();
    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Error during database initialization:', error);
    process.exit(1);
  }
};

// Run if this script is called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;