const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Flattened GitHub Upload Protection ---
// If public exists, use it normally. 
app.use(express.static(path.join(__dirname, 'public')));
// Also serve the root just in case files were dragged randomly!
app.use(express.static(__dirname));

// Emergency Fallbacks if folder structure was destroyed:
app.get('/css/style.css', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'style.css'))) return res.sendFile(path.join(__dirname, 'style.css'));
  res.status(404).end();
});
app.get('/js/app.js', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'app.js'))) return res.sendFile(path.join(__dirname, 'app.js'));
  res.status(404).end();
});
app.get('/', (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'index.html'))) return res.sendFile(path.join(__dirname, 'index.html'));
  res.status(404).end('Cannot GET /');
});
// -------------------------------------------

app.use(session({
  secret: 'agrichain-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // false for localhost HTTP
}));

// --- Authentication Routes ---

app.post('/api/register', async (req, res) => {
  const { name, email, password, role, location, mobile, address, aadhaar_number } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Strict Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length < 5) {
    return res.status(400).json({ error: 'Please enter a valid real email address (e.g., name@gmail.com).' });
  }

  // Strict Password Validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long, contain at least one Uppercase letter, and one Symbol (!@#$&*).' });
  }

  // Aadhaar Verification Logic
  let is_aadhaar_verified = 0;
  if (role === 'farmer') {
    if (!aadhaar_number || aadhaar_number.replace(/\D/g, '').length !== 12) {
      return res.status(400).json({ error: 'Farmers must provide a valid 12-digit Aadhaar Card number.' });
    }
    is_aadhaar_verified = 1; // Simulated backend API validation success
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, role, location, mobile, address, aadhaar_number, is_aadhaar_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, role, location, mobile || null, address || null, aadhaar_number || null, is_aadhaar_verified);
    res.status(201).json({ message: 'User registered successfully', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    // Save session
    req.session.userId = user.id;
    req.session.role = user.role;

    // Don't send password hash back
    delete user.password;
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = db.prepare('SELECT id, name, email, role, location, language FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.put('/api/users/language', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const { language } = req.body;
  try {
    db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.session.userId);
    res.json({ message: 'Language updated' });
  } catch(err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Product Routes ---

// Get all products (for marketplace/retailers)
app.get('/api/products', (req, res) => {
  const role = req.session.role;
  try {
    let products = [];
    if (role === 'customer') {
      products = db.prepare(`
        SELECT p.*, u_farmer.name as farmer_name, u_retailer.name as retailer_name, u_retailer.id as retailer_id,
               COALESCE(o.retail_price, p.farm_price) as display_price, o.quantity as available_qty, o.id as inventory_id, u_farmer.is_aadhaar_verified
        FROM products p
        JOIN users u_farmer ON p.farmer_id = u_farmer.id
        JOIN orders o ON p.id = o.product_id
        JOIN users u_retailer ON o.buyer_id = u_retailer.id
        WHERE o.type = 'farmer_to_retailer' AND o.status = 'confirmed' AND o.payment_status = 'paid' AND o.quantity > 0 AND p.status = 'available'
        ORDER BY p.created_at DESC
      `).all();
    } else {
      products = db.prepare(`
        SELECT p.*, u.name as farmer_name, p.farm_price as display_price, p.quantity as available_qty, p.id as inventory_id, u.is_aadhaar_verified
        FROM products p 
        JOIN users u ON p.farmer_id = u.id
        WHERE p.quantity > 0
        ORDER BY p.created_at DESC
      `).all();
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  if (!req.session.userId || req.session.role !== 'farmer') return res.status(401).json({ error: 'Unauthorized' });
  
  const { name, quantity, location, certification, farm_price, harvest_date, certificateFile, photoFile, videoFile } = req.body;
  
  // Auto-generate unique product batch ID
  const prefix = (!name || name === 'Other') ? 'BATCH' : name.toUpperCase().replace(/\s+/g, '');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  const product_id = `${prefix}-${randomStr}`;
  
  let certificate_url = null;
  let photo_url = null;
  let video_url = null;
  let is_verified = 0;

  // Helper function to decode base64 files
  const saveBase64File = (base64String, defaultExt = 'png') => {
    try {
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const extMatch = matches[1].split('/')[1] || defaultExt;
        const ext = extMatch === 'pdf' ? 'pdf' : (extMatch === 'jpeg' ? 'jpg' : (extMatch === 'mp4' ? 'mp4' : extMatch));
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2,6)}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        return `/uploads/${filename}`;
      }
    } catch(e) {
      console.error('File Upload Error:', e);
    }
    return null;
  };

  if (certificateFile) {
    certificate_url = saveBase64File(certificateFile, 'pdf');
    if (certificate_url) is_verified = 1; // Simulated Government Verification
  }
  
  if (photoFile) photo_url = saveBase64File(photoFile, 'jpg');
  if (videoFile) video_url = saveBase64File(videoFile, 'mp4');

  try {
    const stmt = db.prepare(`
      INSERT INTO products (product_id, farmer_id, name, quantity, location, certification, farm_price, status, certificate_url, is_verified, harvest_date, photo_url, video_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(product_id, req.session.userId, name, quantity, location, certification, farm_price, certificate_url, is_verified, harvest_date, photo_url, video_url);
    
    // Add initial journey step
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    const journeyStmt = db.prepare(`
      INSERT INTO journey (product_id, stage, location, handler, handler_id, price, notes)
      VALUES (?, 'Farm', ?, ?, ?, ?, 'Harvested and packed at farm')
    `);
    journeyStmt.run(info.lastInsertRowid, location, user.name, req.session.userId, farm_price);

    res.status(201).json({ message: 'Product added successfully', id: info.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Product ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get single product details + journey
app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, u.name as farmer_name 
      FROM products p 
      JOIN users u ON p.farmer_id = u.id 
      WHERE p.id = ? OR p.product_id = ?
    `).get(req.params.id, req.params.id);
    
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const journey = db.prepare('SELECT * FROM journey WHERE product_id = ? ORDER BY timestamp ASC').all(product.id);
    
    res.json({ product, journey });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Journey Routes ---

app.post('/api/journey', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });

  const { product_id, stage, location, price, notes } = req.body;
  try {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    const stmt = db.prepare(`
      INSERT INTO journey (product_id, stage, location, handler, handler_id, price, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(product_id, stage, location, user.name, req.session.userId, price, notes);
    
    res.status(201).json({ message: 'Journey step added' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- QR Code Routes ---

app.get('/api/qr/:productId', async (req, res) => {
  try {
    // Generate URL that points to the scanner page
    const host = req.get('host');
    const scanUrl = `http://${host}/scanner.html?id=${req.params.productId}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl);
    res.json({ qr_code: qrCodeDataUrl, url: scanUrl });
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

app.post('/api/qr_scans', (req, res) => {
  const { product_id } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  try {
    db.prepare('INSERT INTO qr_scans (product_id, scanned_by) VALUES (?, ?)').run(product_id, ip);
    res.json({ message: 'Scan logged' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Order Routes ---

app.post('/api/orders', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  
  const { product_id, seller_id, amount, unit, price, type, inventory_id } = req.body;
  let quantity = parseFloat(amount);
  if (unit === 'g') quantity = quantity / 1000;
  const total = quantity * price;

  try {
    const deductStmt = type === 'farmer_to_retailer' 
      ? db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?")
      : db.prepare("UPDATE orders SET quantity = quantity - ? WHERE id = ? AND quantity >= ?");
      
    const info = deductStmt.run(quantity, inventory_id, quantity);
    if(info.changes === 0) return res.status(400).json({ error: 'Not enough available quantity in stock' });

    const parent_order_id = type === 'retailer_to_customer' ? inventory_id : null;

    const stmt = db.prepare(`
      INSERT INTO orders (product_id, buyer_id, seller_id, quantity, price, total, type, status, parent_order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    stmt.run(product_id, req.session.userId, seller_id, quantity, price, total, type, parent_order_id);
    
    res.status(201).json({ message: 'Purchase request sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/orders', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  
  try {
    const orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.product_id as p_id, u.name as seller_name, ub.name as buyer_name, ub.address as buyer_address
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.seller_id = u.id
      JOIN users ub ON o.buyer_id = ub.id
      WHERE o.buyer_id = ? OR o.seller_id = ?
      ORDER BY o.created_at DESC
    `).all(req.session.userId, req.session.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Orders & Pricing Routes ---

app.put('/api/orders/:id/price', (req, res) => {
  if (!req.session.userId || req.session.role !== 'retailer') return res.status(401).json({ error: 'Unauthorized' });
  
  const { retail_price } = req.body;
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(req.params.id, req.session.userId);
    if(!order) return res.status(403).json({ error: 'Order not found or unauthorized' });

    db.prepare('UPDATE orders SET retail_price = ? WHERE id = ?').run(retail_price, req.params.id);
    res.json({ message: 'Store price set successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { action } = req.body;
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(req.params.id, req.session.userId);
    if(!order) return res.status(403).json({ error: 'Order not found or unauthorized' });

    if (action === 'accept') {
      db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(req.params.id);
    } else if (action === 'reject') {
      if (order.type === 'farmer_to_retailer') {
         db.prepare("UPDATE products SET quantity = quantity + ? WHERE id = ?").run(order.quantity, order.product_id);
      } else {
         if (order.parent_order_id) {
           db.prepare("UPDATE orders SET quantity = quantity + ? WHERE id = ?").run(order.quantity, order.parent_order_id);
         }
      }
      db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.json({ message: `Order ${action}ed successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/orders/:id/pay', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(req.params.id, req.session.userId);
    if(!order || order.status !== 'confirmed') return res.status(400).json({ error: 'Order not ready for payment' });

    db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Payment processed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/orders/:id/deliver', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(req.params.id, req.session.userId);
    if(!order) return res.status(403).json({ error: 'Order not found or unauthorized' });

    db.prepare("UPDATE orders SET status = 'delivered' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Delivery confirmed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Stats Routes ---

app.get('/api/stats', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });

  try {
    let stats = {};
    if (req.session.role === 'farmer') {
      stats.totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE farmer_id = ?').get(req.session.userId).c;
      stats.totalSales = db.prepare('SELECT SUM(total) as s FROM orders WHERE seller_id = ?').get(req.session.userId).s || 0;
    } else if (req.session.role === 'retailer') {
      stats.totalPurchased = db.prepare('SELECT SUM(total) as s FROM orders WHERE buyer_id = ?').get(req.session.userId).s || 0;
      stats.totalSales = db.prepare('SELECT SUM(total) as s FROM orders WHERE seller_id = ?').get(req.session.userId).s || 0;
    } else {
      stats.totalPurchased = db.prepare('SELECT SUM(total) as s FROM orders WHERE buyer_id = ?').get(req.session.userId).s || 0;
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Mobile Access QR ---
let globalUrl = null;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/mobile-qr', async (req, res) => {
  try {
    const ip = getLocalIP();
    // Use Render's official URL if deployed, otherwise fallback to local IP
    const url = process.env.RENDER_EXTERNAL_URL || globalUrl || `http://${ip}:${PORT}`;
    const qrCode = await QRCode.toDataURL(url);
    res.json({ url, qrCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AgriChain server running on port ${PORT}`);
  console.log(`Network access: http://${getLocalIP()}:${PORT}`);
  
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`\n========================================================`);
    console.log(`🌍 DEPLOYED LIVE ON RENDER!`);
    console.log(`👉 ${process.env.RENDER_EXTERNAL_URL}`);
    console.log(`========================================================\n`);
  }
});
