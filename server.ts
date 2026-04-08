import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import axios from "axios";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "unlockpro-secret-key";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// Database Setup
const dbPath = process.env.DB_PATH || "unlockpro.db";
const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      tokens REAL DEFAULT 0,
      role TEXT DEFAULT 'User', -- 'Admin', 'Technician', 'Developer', 'Support', 'User'
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT,
      model TEXT,
      chipset TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'trending',
      prices TEXT, -- JSON string
      unlock_commands TEXT, -- JSON string
      constraints TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT, -- 'load', 'unlock', 'commission'
      amount REAL,
      model TEXT,
      service TEXT,
      status TEXT, -- 'pending', 'completed', 'failed'
      reference TEXT,
      developer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(developer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS device_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      model TEXT,
      logs TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exploits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vid TEXT,
      pid TEXT,
      cid TEXT,
      service TEXT,
      commands TEXT, -- JSON array
      manual_steps TEXT, -- JSON array
      developer_id INTEGER,
      status TEXT DEFAULT 'approved', -- 'pending', 'approved'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(developer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exploit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vid TEXT,
      pid TEXT,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add missing columns if they don't exist
  const tables = ['users', 'transactions', 'devices'];
  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnNames = columns.map((c: any) => c.name);
    
    if (table === 'users') {
      if (!columnNames.includes('role')) try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'User'"); } catch (e) {}
      if (!columnNames.includes('is_verified')) try { db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"); } catch (e) {}
      if (!columnNames.includes('username') && columnNames.includes('email')) {
        try { db.exec("ALTER TABLE users RENAME COLUMN email TO username"); } catch (e) {}
      }
    }
    if (table === 'devices') {
      if (!columnNames.includes('chipset')) try { db.exec("ALTER TABLE devices ADD COLUMN chipset TEXT"); } catch (e) {}
    }
    if (table === 'transactions') {
      if (!columnNames.includes('model')) try { db.exec("ALTER TABLE transactions ADD COLUMN model TEXT"); } catch (e) {}
      if (!columnNames.includes('service')) try { db.exec("ALTER TABLE transactions ADD COLUMN service TEXT"); } catch (e) {}
      if (!columnNames.includes('reference')) try { db.exec("ALTER TABLE transactions ADD COLUMN reference TEXT"); } catch (e) {}
      if (!columnNames.includes('developer_id')) try { db.exec("ALTER TABLE transactions ADD COLUMN developer_id INTEGER"); } catch (e) {}
    }
  }

app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Role-based Middleware
const authorize = (roles: string[]) => (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!roles.includes(decoded.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${roles.join(", ")}]` });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Legacy Admin Middleware (updated)
const authenticateAdmin = authorize(['Admin', 'Technician']);

// --- Command Database ---
const COMMAND_DATABASE: any = {
  "Samsung": {
    "Galaxy Series": {
      "FRP": {
        "adb": ["adb shell am start -n com.google.android.gsf.login/com.google.android.gsf.login.LoginActivity", "adb shell content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1"],
        "fastboot": ["fastboot erase config", "fastboot erase frp"]
      },
      "SIM": {
        "adb": ["adb shell setprop ro.carrier.unlock 1", "adb shell getprop ril.sales_code"]
      },
      "MDM": {
        "adb": ["adb shell pm uninstall -k --user 0 com.sec.enterprise.knox.cloudmdm.smdm"]
      }
    }
  },
  "Apple": {
    "iPhone 15 Pro": {
      "iCloud": {
        "dfu": ["Checkm8 Exploit v2.0", "Mount /mnt2", "Remove setup.app"]
      }
    }
  },
  "Xiaomi": {
    "Mi / Redmi Series": {
      "Mi Account": {
        "fastboot": ["fastboot erase persist", "fastboot reboot"]
      },
      "FRP": {
        "fastboot": ["fastboot -w"]
      }
    }
  },
  "Nokia": {
    "All MTK Models": {
      "FRP": {
        "fastboot": ["fastboot erase frp"]
      },
      "MDM": {
        "fastboot": ["fastboot erase config"]
      }
    }
  },
  "Motorola": {
    "Moto G/E/Z Series": {
      "FRP": {
        "fastboot": ["fastboot erase config", "fastboot erase oem_config"]
      }
    }
  },
  "Lenovo": {
    "Tab / Phab Series": {
      "FRP": {
        "fastboot": ["fastboot erase config"]
      }
    }
  },
  "Spreadtrum": {
    "SC Series Chips": {
      "FRP": {
        "fastboot": ["fastboot erase persist"]
      }
    }
  },
  "Google": {
    "Pixel Series": {
      "BOOTLOADER": {
        "fastboot": ["fastboot flashing unlock"]
      }
    }
  },
  "Qualcomm": {
    "Generic EDL": {
      "FRP": {
        "edl": ["emmcdl -p com* -f prog_emmc_firehose* -e config"]
      },
      "MDM": {
        "edl": ["emmcdl -p com* -f prog_emmc_firehose* -e persist"]
      }
    }
  }
};

// --- Paystack ---
app.post("/api/paystack/initialize", authenticate, async (req: any, res) => {
  const { amount, email } = req.body;
  const reference = `unlockpro-${Date.now()}-${req.user.id}`;

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Paystack expects amount in kobo/cents
        reference,
        callback_url: `${req.headers.origin}/app?payment=paystack&reference=${reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    db.prepare("INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.id, "load", amount, "pending", reference);

    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

app.get("/api/paystack/verify", authenticate, async (req: any, res) => {
  const { reference } = req.query;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === true && response.data.data.status === "success") {
      const amount = response.data.data.amount / 100;
      const userId = req.user.id;

      const transaction: any = db.prepare("SELECT * FROM transactions WHERE reference = ?").get(reference);
      
      if (transaction && transaction.status === "pending") {
        db.transaction(() => {
          db.prepare("UPDATE users SET tokens = tokens + ? WHERE id = ?").run(amount, userId);
          db.prepare("UPDATE transactions SET status = 'completed' WHERE reference = ?").run(reference);
        })();
        res.json({ success: true, amount });
      } else {
        res.status(400).json({ error: "Transaction already processed or not found" });
      }
    } else {
      res.status(400).json({ error: "Payment verification failed" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Exploits API ---
app.get("/api/exploits/match", authenticate, (req: any, res) => {
  const { vid, pid, service } = req.query;
  
  if (!vid || !pid || !service) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const exploit: any = db.prepare("SELECT * FROM exploits WHERE vid = ? AND pid = ? AND service = ? AND status = 'approved'").get(vid, pid, service);
  
  if (exploit) {
    res.json({
      found: true,
      exploit: {
        id: exploit.id,
        commands: JSON.parse(exploit.commands || '[]'),
        manualSteps: JSON.parse(exploit.manual_steps || '[]'),
        developerId: exploit.developer_id
      }
    });
  } else {
    res.json({ found: false });
  }
});

app.post("/api/exploits/request", authenticate, (req: any, res) => {
  const { vid, pid, email, phone } = req.body;
  
  if (!vid || !pid || !email || !phone) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  db.prepare("INSERT INTO exploit_requests (vid, pid, email, phone) VALUES (?, ?, ?, ?)")
    .run(vid, pid, email, phone);
    
  res.json({ success: true });
});

// Developer UI APIs
app.get("/api/exploits", authorize(['Admin', 'Developer']), (req: any, res) => {
  let exploits;
  if (req.user.role === 'Admin') {
    exploits = db.prepare("SELECT e.*, u.username as developer_username FROM exploits e JOIN users u ON e.developer_id = u.id ORDER BY e.created_at DESC").all();
  } else {
    exploits = db.prepare("SELECT * FROM exploits WHERE developer_id = ? ORDER BY created_at DESC").all(req.user.id);
  }
  
  res.json(exploits.map((e: any) => ({
    ...e,
    commands: JSON.parse(e.commands || '[]'),
    manual_steps: JSON.parse(e.manual_steps || '[]')
  })));
});

app.post("/api/exploits", authorize(['Admin', 'Developer']), (req: any, res) => {
  const { vid, pid, cid, service, commands, manualSteps } = req.body;
  
  const info = db.prepare(`
    INSERT INTO exploits (vid, pid, cid, service, commands, manual_steps, developer_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')
  `).run(
    vid, pid, cid || '', service, 
    JSON.stringify(commands || []), 
    JSON.stringify(manualSteps || []), 
    req.user.id
  );
  
  res.json({ success: true, id: info.lastInsertRowid });
});

// --- Hardware Token Verification ---
app.post("/api/unlock/verify-hardware-token", authenticate, (req: any, res) => {
  const { token, transactionId } = req.body;
  
  // In a real scenario, the token would be cryptographically verified
  // against the device's hardware signature and the transaction record.
  
  const transaction: any = db.prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?").get(transactionId, req.user.id);
  
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  
  if (transaction.status !== "completed") {
    return res.status(400).json({ error: "Transaction not completed" });
  }

  // Simple mock verification logic
  if (token && token.length > 10) {
    res.json({ success: true, message: "Hardware token verified successfully. Final reboot authorized." });
  } else {
    res.status(400).json({ error: "Invalid hardware token" });
  }
});

// --- Socket.io Remote Bridge ---
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("usb:packet", ({ roomId, packet }) => {
    // Forward USB packet to other participants in the room
    socket.to(roomId).emit("usb:packet", packet);
  });

  socket.on("usb:request", ({ roomId, request }) => {
    // Forward USB request (e.g., "read", "write")
    socket.to(roomId).emit("usb:request", request);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// --- GitHub Integration (MCP/Private Repo) ---
app.get("/api/github/manifest", authenticate, async (req: any, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO_URL; // e.g. "https://github.com/user/repo"
  
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: "GitHub integration not configured" });
  }

  try {
    const repoPath = GITHUB_REPO.replace("https://github.com/", "");
    const response = await axios.get(
      `https://api.github.com/repos/${repoPath}/contents/GEMINI.md`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );
    res.send(response.data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch manifest: " + err.message });
  }
});

app.get("/api/github/binary", authenticate, async (req: any, res) => {
  const { path: binaryPath } = req.query;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO_URL;

  if (!GITHUB_TOKEN || !GITHUB_REPO || !binaryPath) {
    return res.status(400).json({ error: "Missing parameters or configuration" });
  }

  try {
    const repoPath = GITHUB_REPO.replace("https://github.com/", "");
    const response = await axios.get(
      `https://api.github.com/repos/${repoPath}/contents/${binaryPath}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
        },
        responseType: 'arraybuffer'
      }
    );
    res.set('Content-Type', 'application/octet-stream');
    res.send(response.data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch binary: " + err.message });
  }
});

// --- API Routes ---

app.get("/api/sessions", authenticate, (req: any, res) => {
  // Return active sessions for the user (e.g. recent transactions or active bridge sessions)
  const sessions = db.prepare(`
    SELECT t.*, d.model, d.brand 
    FROM transactions t 
    LEFT JOIN devices d ON t.type = d.model 
    WHERE t.user_id = ? 
    ORDER BY t.created_at DESC 
    LIMIT 20
  `).all(req.user.id);
  res.json(sessions);
});

app.get("/api/unlock/commands", authenticate, (req: any, res) => {
  const { brand, model, lockType } = req.query;
  if (!brand || !model || !lockType) return res.status(400).json({ error: "Missing parameters" });
  
  const brandData = COMMAND_DATABASE[brand as string];
  const modelData = brandData ? brandData[model as string] : null;
  const commands = modelData ? modelData[lockType as string] : null;
  
  if (!commands) {
    // Return generic fallback if specific not found
    return res.json({
      adb: ["adb reboot bootloader", "adb shell getprop ro.serialno"],
      fastboot: ["fastboot devices", "fastboot getvar all"],
      generic: true
    });
  }
  
  res.json(commands);
});

// Auth
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username, password, role, is_verified) VALUES (?, ?, ?, ?)").run(username, hashedPassword, 'User', 0);
    const token = jwt.sign({ id: info.lastInsertRowid, username, role: 'User' }, JWT_SECRET);
    res.json({ id: info.lastInsertRowid, username, tokens: 0, role: 'User', isVerified: false, token });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/verify", authenticate, (req: any, res) => {
  db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(req.user.id);
  res.json({ success: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ id: user.id, username: user.username, tokens: user.tokens, role: user.role, isVerified: user.is_verified === 1, token });
});

app.post("/api/auth/firebase", async (req, res) => {
  const { uid, email, displayName } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: "Missing Firebase user data" });
  }

  try {
    // Check if user exists by username (which we'll set to email for Google users)
    let user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(email);
    
    if (!user) {
      // Create new user
      const hashedPassword = await bcrypt.hash(uid, 10); // Use uid as a dummy password
      const info = db.prepare("INSERT INTO users (username, password, role, is_verified) VALUES (?, ?, ?, ?)").run(email, hashedPassword, 'User', 1);
      user = { id: info.lastInsertRowid, username: email, tokens: 0, role: 'User', is_verified: 1 };
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ id: user.id, username: user.username, tokens: user.tokens, role: user.role, isVerified: user.is_verified === 1, token });
  } catch (err) {
    res.status(500).json({ error: "Firebase authentication failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/auth/me", authenticate, (req: any, res) => {
  const user: any = db.prepare("SELECT id, username, tokens, role, is_verified FROM users WHERE id = ?").get(req.user.id);
  res.json({ ...user, isVerified: user.is_verified === 1 });
});

// Devices Management
app.get("/api/devices", (req, res) => {
  const devices = db.prepare("SELECT * FROM devices").all();
  res.json(devices.map((d: any) => ({
    id: d.id,
    brand: d.brand,
    model: d.model,
    chipset: d.chipset,
    imageUrl: d.image_url,
    category: d.category,
    prices: JSON.parse(d.prices || '{}'),
    unlockCommands: JSON.parse(d.unlock_commands || '{}'),
    constraints: JSON.parse(d.constraints || '{}'),
    createdAt: d.created_at
  })));
});

app.post("/api/devices", authorize(['Admin', 'Technician']), (req, res) => {
  const { brand, model, chipset, image_url, category, prices, unlock_commands, constraints } = req.body;
  const info = db.prepare(`
    INSERT INTO devices (brand, model, chipset, image_url, category, prices, unlock_commands, constraints)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    brand, 
    model, 
    chipset,
    image_url, 
    category, 
    JSON.stringify(prices || {}), 
    JSON.stringify(unlock_commands || {}), 
    JSON.stringify(constraints || {})
  );
  res.json({ id: info.lastInsertRowid });
});

app.put("/api/devices/:id", authorize(['Admin', 'Technician']), (req, res) => {
  const { brand, model, chipset, image_url, category, prices, unlock_commands, constraints } = req.body;
  db.prepare(`
    UPDATE devices SET brand = ?, model = ?, chipset = ?, image_url = ?, category = ?, prices = ?, unlock_commands = ?, constraints = ?
    WHERE id = ?
  `).run(
    brand, 
    model, 
    chipset,
    image_url, 
    category, 
    JSON.stringify(prices || {}), 
    JSON.stringify(unlock_commands || {}), 
    JSON.stringify(constraints || {}),
    req.params.id
  );
  res.json({ success: true });
});

app.delete("/api/devices/:id", authorize(['Admin', 'Technician']), (req, res) => {
  db.prepare("DELETE FROM devices WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Unlock
app.post("/api/unlock/authorize", authenticate, (req: any, res) => {
  const { model, service, price, exploitId } = req.body;
  const user: any = db.prepare("SELECT tokens FROM users WHERE id = ?").get(req.user.id);

  if (user.tokens < price) {
    return res.status(400).json({ error: "Insufficient tokens" });
  }

  let developerId = null;
  let commission = 0;

  if (exploitId) {
    const exploit: any = db.prepare("SELECT developer_id FROM exploits WHERE id = ?").get(exploitId);
    if (exploit && exploit.developer_id) {
      developerId = exploit.developer_id;
      commission = price * 0.40; // 40% commission
    }
  }

  db.transaction(() => {
    // Deduct from user
    db.prepare("UPDATE users SET tokens = tokens - ? WHERE id = ?").run(price, req.user.id);
    
    // Record unlock transaction
    db.prepare("INSERT INTO transactions (user_id, type, amount, model, service, status, developer_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(req.user.id, "unlock", price, model, service, "completed", developerId);

    // Pay commission to developer
    if (developerId && commission > 0) {
      db.prepare("UPDATE users SET tokens = tokens + ? WHERE id = ?").run(commission, developerId);
      db.prepare("INSERT INTO transactions (user_id, type, amount, status, reference) VALUES (?, ?, ?, ?, ?)")
        .run(developerId, "commission", commission, "completed", `comm-${Date.now()}`);
    }
  })();

  res.json({ success: true, newBalance: user.tokens - price });
});

// Admin Routes
app.post("/api/logs/upload", authenticate, (req: any, res) => {
  const { model, logs, status } = req.body;
  db.prepare("INSERT INTO device_logs (user_id, model, logs, status) VALUES (?, ?, ?, ?)")
    .run(req.user.id, model, JSON.stringify(logs), status);
  res.json({ success: true });
});

app.get("/api/admin/logs", authorize(['Admin', 'Technician']), (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.username 
    FROM device_logs l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.created_at DESC 
    LIMIT 100
  `).all();
  res.json(logs);
});

app.get("/api/admin/transactions", authorize(['Admin', 'Technician', 'Support']), (req, res) => {
  const transactions = db.prepare(`
    SELECT t.*, u.username as user_username 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC
  `).all();
  res.json(transactions);
});

app.get("/api/admin/stats", authorize(['Admin', 'Technician', 'Support']), (req, res) => {
  const stats = {
    totalUsers: db.prepare("SELECT COUNT(*) as count FROM users").get().count,
    totalTokens: db.prepare("SELECT SUM(tokens) as sum FROM users").get().sum || 0,
    totalTransactions: db.prepare("SELECT COUNT(*) as count FROM transactions").get().count,
    recentTransactions: db.prepare("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5").all()
  };
  res.json(stats);
});

// --- Vite Middleware ---
async function startServer() {
  // Ensure sessions table or similar exists if needed, but we'll use transactions for now
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      device_info TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global Error Handler for better debugging
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(`[ERROR] ${req.method} ${req.url}`);
    console.error(err.stack);
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      details: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });

  server.listen(Number(PORT), "0.0.0.0", async () => {
    // Seed Admin
    const adminUsername = "vando";
    const adminPass = "savage";
    const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get(adminUsername);
    if (!existingAdmin) {
      const hashedPass = await bcrypt.hash(adminPass, 10);
      db.prepare("INSERT INTO users (username, password, role, tokens, is_verified) VALUES (?, ?, ?, ?, ?)").run(adminUsername, hashedPass, 'Admin', 999999, 1);
      console.log("Admin user seeded: vando / savage");
    }

    // Seed some devices if empty
    const deviceCount = db.prepare("SELECT COUNT(*) as count FROM devices").get().count;
    if (deviceCount === 0) {
      const sampleDevices = [
        {
          brand: 'Samsung',
          model: 'Galaxy Series',
          chipset: 'Exynos / Snapdragon',
          image_url: 'https://images.unsplash.com/photo-1707150244405-f9828453472b?q=80&w=800&auto=format&fit=crop',
          category: 'trending',
          prices: { FRP: 15, MDM: 25, SIM: 30 },
          unlock_commands: { 
            FRP: { adb: ["adb shell am start -n com.google.android.gsf.login/com.google.android.gsf.login.LoginActivity"] } 
          },
          constraints: { requires_adb: true }
        },
        {
          brand: 'Apple',
          model: 'iPhone 15 Pro',
          chipset: 'A17 Pro',
          image_url: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop',
          category: 'trending',
          prices: { iCloud: 50, SIM: 40 },
          unlock_commands: { 
            iCloud: { dfu: ["Checkm8 Exploit v2.0", "Remove setup.app"] } 
          },
          constraints: { requires_dfu: true }
        },
        {
          brand: 'Xiaomi',
          model: 'Mi / Redmi Series',
          chipset: 'Qualcomm / MediaTek',
          image_url: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop',
          category: 'trending',
          prices: { 'Mi Account': 20, FRP: 10 },
          unlock_commands: { 'Mi Account': { fastboot: ["fastboot erase persist"] } },
          constraints: { requires_fastboot: true }
        },
        {
          brand: 'Nokia',
          model: 'All MTK Models',
          chipset: 'MediaTek',
          image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop',
          category: 'most-unlocked',
          prices: { FRP: 15, MDM: 25 },
          unlock_commands: { FRP: { fastboot: ["fastboot erase frp"] } },
          constraints: { requires_fastboot: true }
        },
        {
          brand: 'Motorola',
          model: 'Moto G/E/Z Series',
          chipset: 'Qualcomm',
          image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
          category: 'trending',
          prices: { FRP: 10 },
          unlock_commands: { FRP: { fastboot: ["fastboot erase config"] } },
          constraints: { requires_fastboot: true }
        },
        {
          brand: 'Qualcomm',
          model: 'Generic EDL',
          chipset: 'Snapdragon',
          image_url: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop',
          category: 'trending',
          prices: { FRP: 25, MDM: 35 },
          unlock_commands: { FRP: { edl: ["emmcdl -p com* -f prog_emmc_firehose* -e config"] } },
          constraints: { requires_edl: true }
        },
        {
          brand: 'Google',
          model: 'Pixel 9 Pro',
          chipset: 'Tensor G4',
          image_url: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop',
          category: 'coming-soon',
          prices: { BOOTLOADER: 50 },
          unlock_commands: { BOOTLOADER: { fastboot: ["fastboot flashing unlock"] } },
          constraints: { requires_fastboot: true }
        },
        {
          brand: 'Samsung',
          model: 'Galaxy S25 Ultra',
          chipset: 'Snapdragon 8 Gen 4',
          image_url: 'https://images.unsplash.com/photo-1707150244405-f9828453472b?q=80&w=800&auto=format&fit=crop',
          category: 'coming-soon',
          prices: { FRP: 30, MDM: 40 },
          unlock_commands: { FRP: { adb: ["adb shell am start -n com.google.android.gsf.login/com.google.android.gsf.login.LoginActivity"] } },
          constraints: { requires_adb: true }
        },
        {
          brand: 'Nokia',
          model: '105 (2023)',
          chipset: 'MTK6261',
          image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop',
          category: 'feature-phones',
          prices: { Passcode: 1.3 },
          unlock_commands: { Passcode: { manual: ['Power off', 'Hold * and Power', 'Select Wipe Data/Factory Reset'] } },
          constraints: { requires_manual: true }
        },
        {
          brand: 'Itel',
          model: 'it2173',
          chipset: 'SC6531E',
          image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
          category: 'feature-phones',
          prices: { Passcode: 1.3 },
          unlock_commands: { Passcode: { manual: ['Power off', 'Hold Call and Power', 'Select Factory Reset'] } },
          constraints: { requires_manual: true }
        }
      ];

      for (const d of sampleDevices) {
        db.prepare(`
          INSERT INTO devices (brand, model, chipset, image_url, category, prices, unlock_commands, constraints)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(d.brand, d.model, d.chipset, d.image_url, d.category, JSON.stringify(d.prices), JSON.stringify(d.unlock_commands), JSON.stringify(d.constraints));
      }
      console.log("Sample devices seeded");
    }

    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
