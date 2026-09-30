require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONITORING_PLATFORM_URL: process.env.MONITORING_PLATFORM_URL || 'http://localhost:8000/api/ingest/events',
  SQLITE_PATH: process.env.SQLITE_PATH || './backend.sqlite',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
