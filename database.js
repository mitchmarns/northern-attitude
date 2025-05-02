const mysql = require('mysql2/promise');
const config = require('./config');

// Create a pool of connections
const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper functions for database operations
const db = {
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  
  beginTransaction: async () => {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    return conn;
  },
  
  commit: async (conn) => {
    if (conn) {
      await conn.commit();
      conn.release();
    } else {
      // If no connection is provided, create a new one
      const newConn = await pool.getConnection();
      await newConn.commit();
      newConn.release();
    }
  },
  
  rollback: async (conn) => {
    if (conn) {
      await conn.rollback();
      conn.release();
    } else {
      // If no connection is provided, create a new one
      const newConn = await pool.getConnection();
      await newConn.rollback();
      newConn.release();
    }
  }
};

module.exports = db;
