const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

const dbPath = path.resolve(__dirname, '..', config.SQLITE_PATH);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[ControlledBackend] Error connecting to SQLite database:', err.message);
  } else {
    console.log('[ControlledBackend] Connected to SQLite database at', dbPath);
  }
});

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          department TEXT NOT NULL,
          role TEXT NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Resources table
      db.run(`
        CREATE TABLE IF NOT EXISTS resources (
          resource_id TEXT PRIMARY KEY,
          filename TEXT UNIQUE NOT NULL,
          classification TEXT NOT NULL,
          size_kb INTEGER NOT NULL,
          description TEXT
        )
      `);

      // 3. Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          ip TEXT NOT NULL,
          user_agent TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
      `);

      // 4. Activities table
      db.run(`
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT UNIQUE NOT NULL,
          user_id TEXT,
          session_id TEXT,
          event_type TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip TEXT,
          resource TEXT,
          status TEXT,
          details TEXT
        )
      `, (err) => {
        if (err) return reject(err);

        // Seed demo users if empty
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) return reject(err);
          if (row.count === 0) {
            console.log('[ControlledBackend] Seeding demo users U001-U005...');
            const insertUser = db.prepare(`
              INSERT INTO users (user_id, name, email, department, role, password)
              VALUES (?, ?, ?, ?, ?, ?)
            `);

            const demoUsers = [
              ['U001', 'Rahul Sharma', 'rahul@corp.internal', 'Engineering', 'Lead Architect', 'password123'],
              ['U002', 'Amit Patel', 'amit@corp.internal', 'Finance', 'Financial Analyst', 'password123'],
              ['U003', 'Priya Singh', 'priya@corp.internal', 'Human Resources', 'HR Manager', 'password123'],
              ['U004', 'Neha Gupta', 'neha@corp.internal', 'Sales', 'Account Executive', 'password123'],
              ['U005', 'Rohan Verma', 'rohan@corp.internal', 'Marketing', 'Growth Lead', 'password123']
            ];

            demoUsers.forEach(u => insertUser.run(u));
            insertUser.finalize();
          }
        });

        // Seed resources if empty
        db.get('SELECT COUNT(*) as count FROM resources', (err, row) => {
          if (err) return reject(err);
          if (row.count === 0) {
            console.log('[ControlledBackend] Seeding demo resources...');
            const insertResource = db.prepare(`
              INSERT INTO resources (resource_id, filename, classification, size_kb, description)
              VALUES (?, ?, ?, ?, ?)
            `);

            const demoResources = [
              ['RES001', 'report.pdf', 'CONFIDENTIAL', 2450, 'Q3 Corporate Performance and Projections Report'],
              ['RES002', 'finance_q3.xlsx', 'RESTRICTED', 1820, 'Internal Balance Sheet and Revenue Analysis'],
              ['RES003', 'system_config.json', 'CRITICAL_INTERNAL', 48, 'Production Infrastructure Secrets and Configs'],
              ['RES004', 'customer_data.csv', 'CONFIDENTIAL', 9540, 'Anonymized Enterprise Customer Contacts Registry'],
              ['RES005', 'audit_log.txt', 'INTERNAL', 620, 'Internal Compliance and Audit Sign-off Records']
            ];

            demoResources.forEach(r => insertResource.run(r));
            insertResource.finalize();
          }
          resolve();
        });
      });
    });
  });
}

module.exports = {
  db,
  initDatabase
};
