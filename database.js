const Database = require('better-sqlite3');
const path = require('path');

// Open or create the database
const dbPath = path.join(__dirname, 'agri.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
function initDb() {
  // Table 1: users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('farmer', 'retailer', 'customer')),
      location TEXT,
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table 2: products
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE NOT NULL,
      farmer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      certification TEXT,
      farm_price REAL NOT NULL,
      quantity REAL NOT NULL,
      harvest_date TEXT NOT NULL,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'sold', 'in_transit')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farmer_id) REFERENCES users(id)
    )
  `);

  // Table 3: journey
  db.exec(`
    CREATE TABLE IF NOT EXISTS journey (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      location TEXT NOT NULL,
      handler TEXT NOT NULL,
      handler_id INTEGER NOT NULL,
      price REAL NOT NULL,
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (handler_id) REFERENCES users(id)
    )
  `);

  // Table 4: orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('farmer_to_retailer', 'retailer_to_customer')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'delivered')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // Table 5: qr_scans
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      scanned_by TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Migration for new feature
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN retail_price REAL DEFAULT NULL;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE orders ADD COLUMN parent_order_id INTEGER DEFAULT NULL;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE products ADD COLUMN certificate_url TEXT DEFAULT NULL;`);
    db.exec(`ALTER TABLE products ADD COLUMN is_verified INTEGER DEFAULT 0;`);
  } catch (e) {}

  console.log('Database initialized successfully.');
}

initDb();

module.exports = db;
