const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'northern_attitude',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Database config (sensitive info redacted):', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password
});

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    console.log('Successfully connected to MySQL server');
    
    // Check if database exists
    const [databases] = await connection.query(`SHOW DATABASES LIKE '${dbConfig.database}'`);
    const databaseExists = databases.length > 0;
    
    console.log(`Database '${dbConfig.database}' exists:`, databaseExists);
    
    if (!databaseExists) {
      console.log(`Creating database '${dbConfig.database}'...`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      console.log('Database created successfully');
    }
    
    // Use the database
    await connection.query(`USE ${dbConfig.database}`);
    console.log(`Using database '${dbConfig.database}'`);
    
    // Check if threads table exists
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = '${dbConfig.database}' 
      AND table_name = 'threads'
    `);
    
    const threadTableExists = tables[0].count > 0;
    console.log('Threads table exists:', threadTableExists);
    
    if (threadTableExists) {
      // Try a simple insert
      const [result] = await connection.query(`
        INSERT INTO threads (title, description, creator_id, privacy, status)
        VALUES ('Test Thread', 'Direct test from script', 1, 'public', 'active')
      `);
      
      console.log('Test insert successful, inserted ID:', result.insertId);
      
      // Verify the inserted thread
      const [threads] = await connection.query('SELECT * FROM threads WHERE id = ?', [result.insertId]);
      console.log('Retrieved test thread:', threads[0]);
    } else {
      console.log('Threads table does not exist, cannot test insert');
    }
    
    // Close connection
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

// Run the test
testDatabaseConnection();
