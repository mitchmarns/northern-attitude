const { db } = require('./connection');

// Helper function for database queries (Promise-based)
function dbQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

// Helper function for database query returning multiple rows
function dbQueryAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
}

// Helper function for database execute (Promise-based)
function dbExecute(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

// Helper function for transactions
function dbTransaction(operations) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Execute all operations
        Promise.all(operations)
          .then((results) => {
            // Commit transaction if all operations succeed
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              resolve(results);
            });
          })
          .catch((err) => {
            // Rollback transaction if any operation fails
            db.run('ROLLBACK', () => {
              reject(err);
            });
          });
      });
    });
  });
}

module.exports = {
  dbQuery,
  dbQueryAll,
  dbExecute,
  dbTransaction
};