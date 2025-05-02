/**
 * Configuration settings for Northern Attitude
 */

require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    secret: process.env.SESSION_SECRET || 'northern-attitude-secret-key'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'northern_attitude',
    connectionLimit: 10
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || 'noreply@northernattitude.com'
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    baseUrl: process.env.STORAGE_BASE_URL || '/uploads',
    uploadDir: process.env.STORAGE_UPLOAD_DIR || 'public/uploads'
  }
};
