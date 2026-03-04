import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
let db: any;
try {
  const dbPath = process.env.VERCEL ? path.join("/tmp", "clinic.db") : "clinic.db";
  console.log(`Initializing database at: ${dbPath}`);
  db = new Database(dbPath);
} catch (error) {
  console.error('CRITICAL: Failed to initialize database:', error);
  // Fallback or exit? For now, we'll let it fail but with a log
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendAdminNotification(newUser: any) {
  if (!resend || !db) {
    console.log('RESEND_API_KEY not found or DB not initialized. Skipping email notification.');
    return;
  }

  const admins = db.prepare("SELECT email FROM staff WHERE role = 'admin'").all() as { email: string }[];
  if (admins.length === 0) return;

  const adminEmails = admins.map(a => a.email);

  try {
    await resend.emails.send({
      from: 'AraClinic <notifications@resend.dev>',
      to: adminEmails,
      subject: 'New Staff Registration - Pending Approval',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">New Staff Registration</h2>
          <p>A new user has registered and is awaiting approval:</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p><strong>Name:</strong> ${newUser.name}</p>
            <p><strong>Email:</strong> ${newUser.email}</p>
            <p><strong>Branch:</strong> ${newUser.branch}</p>
            <p><strong>Phone:</strong> ${newUser.phone || 'N/A'}</p>
            <p><strong>Date Joined:</strong> ${new Date(newUser.date_joined).toLocaleString()}</p>
          </div>
          <p style="margin-top: 20px;">
            Please log in to the <a href="${process.env.APP_URL || '#'}" style="color: #10b981; font-weight: bold;">Admin Panel</a> to review and approve this application.
          </p>
        </div>
      `
    });
    console.log('Admin notification email sent successfully.');
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
  }
}

// Initialize database
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT DEFAULT 'password123',
      role TEXT DEFAULT 'staff', -- 'staff', 'receptionist', 'admin', 'dispensary'
      promo_code TEXT UNIQUE NOT NULL,
      staff_id_code TEXT, -- HR Staff ID
      branch TEXT,
      department TEXT,
      position TEXT,
      employment_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'resigned', 'under_review'
      date_joined TEXT,
      pending_earnings REAL DEFAULT 0,
      approved_earnings REAL DEFAULT 0,
      paid_earnings REAL DEFAULT 0,
      lifetime_earnings REAL DEFAULT 0,
      last_payout_date TEXT,
      referrer_type TEXT DEFAULT 'staff', -- 'staff', 'patient', 'public'
      phone TEXT,
      is_approved INTEGER DEFAULT 0 -- 0: pending, 1: approved
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_price REAL NOT NULL,
      commission_rate REAL NOT NULL, -- Fixed RM5 for screening in this phase
      aracoins_perk INTEGER DEFAULT 0,
      allowances_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT,
      patient_ic TEXT,
      patient_address TEXT,
      patient_type TEXT DEFAULT 'new',
      appointment_date TEXT,
      booking_time TEXT,
      visit_date TEXT,
      date TEXT NOT NULL, -- Referral entry date
      status TEXT DEFAULT 'entered', -- 'entered', 'completed', 'paid_completed', 'buffer', 'approved', 'payout_processed'
      payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed'
      commission_amount REAL DEFAULT 5.0,
      fraud_flags TEXT DEFAULT '[]',
      rejection_reason TEXT,
      created_by INTEGER,
      verified_by INTEGER,
      branch TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending',
      assigned_to INTEGER,
      created_at TEXT,
      FOREIGN KEY (assigned_to) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration for existing databases
  try { db.exec("ALTER TABLE staff ADD COLUMN staff_id_code TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN branch TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN department TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN position TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN employment_status TEXT DEFAULT 'active'"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN date_joined TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN pending_earnings REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN approved_earnings REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN paid_earnings REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN lifetime_earnings REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN last_payout_date TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN referrer_type TEXT DEFAULT 'staff'"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN phone TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN is_approved INTEGER DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN nickname TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN profile_picture TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN bank_name TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN bank_account_number TEXT"); } catch(e) {}
  db.prepare("UPDATE staff SET is_approved = 1 WHERE role = 'admin'").run();

  try { db.exec("ALTER TABLE referrals ADD COLUMN patient_ic TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN patient_address TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN visit_date TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN payment_status TEXT DEFAULT 'pending'"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN fraud_flags TEXT DEFAULT '[]'"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN rejection_reason TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE referrals ADD COLUMN branch TEXT"); } catch(e) {}

  // Seed initial data if empty
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get() as { count: number };
  if (staffCount.count === 0) {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO staff (name, email, password, role, promo_code, branch, staff_id_code, date_joined, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").run("Admin User", "admin@clinic.com", "password123", "admin", "ADMIN-HQ", "HQ", "STF-001", now);
    db.prepare("INSERT INTO staff (name, email, password, role, promo_code, branch, staff_id_code, date_joined, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").run("Amir", "amir@clinic.com", "password123", "staff", "AMIR-BGI", "Bangi", "STF-002", now);
    db.prepare("INSERT INTO staff (name, email, password, role, promo_code, branch, staff_id_code, date_joined, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").run("Sarah", "sarah@clinic.com", "password123", "staff", "SARAH-KJG", "Kajang", "STF-003", now);
    db.prepare("INSERT INTO staff (name, email, password, role, promo_code, branch, staff_id_code, date_joined, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").run("Receptionist Sarah", "sarah_rec@clinic.com", "password123", "receptionist", "REC-001", "Bangi", "STF-004", now);

    db.prepare("INSERT INTO services (name, base_price, commission_rate) VALUES (?, ?, ?)").run("Basic Health Screening", 80, 5);
    db.prepare("INSERT INTO services (name, base_price, commission_rate) VALUES (?, ?, ?)").run("Comprehensive Screening", 150, 5);
    db.prepare("INSERT INTO services (name, base_price, commission_rate) VALUES (?, ?, ?)").run("Vaccination Package", 120, 5);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to check database availability
app.use((req, res, next) => {
  if (!db && req.path.startsWith('/api') && req.path !== '/api/health') {
    return res.status(503).json({ 
      error: "Database unavailable", 
      message: "The server is currently unable to handle the request due to a database initialization failure." 
    });
  }
  next();
});

const PORT = 3000;

// API Routes
app.get("/api/health", (req, res) => {
  let dbStatus = "unknown";
  try {
    if (db) {
      db.prepare("SELECT 1").get();
      dbStatus = "connected";
    } else {
      dbStatus = "not_initialized";
    }
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({ 
    status: "ok", 
    db: dbStatus,
    time: new Date().toISOString(),
    vercel: !!process.env.VERCEL,
    env: process.env.NODE_ENV
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  const staff = db.prepare("SELECT * FROM staff WHERE email = ? AND password = ?").get(email, password) as any;
  if (staff) {
    console.log(`Login successful for: ${email}`);
    res.json(staff);
  } else {
    console.log(`Login failed for: ${email}`);
    res.status(401).json({ error: "Invalid email or password" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, branch, phone } = req.body;
  
  // Check if registration is allowed
  const settings = db.prepare("SELECT value FROM settings WHERE key = 'auth'").get() as any;
  const authSettings = settings ? JSON.parse(settings.value) : { allowRegistration: true };
  
  if (!authSettings.allowRegistration) {
    return res.status(403).json({ error: "Self-registration is currently disabled. Please contact an administrator." });
  }

  // Generate a promo code
  const namePart = name.split(' ')[0].toUpperCase();
  const randomPart = Math.floor(100 + Math.random() * 899);
  const promo_code = `${namePart}-${randomPart}`;

  try {
    const result = db.prepare(`
      INSERT INTO staff (name, email, password, role, promo_code, branch, phone, date_joined, is_approved)
      VALUES (?, ?, ?, 'staff', ?, ?, ?, ?, 0)
    `).run(name, email, password || 'password123', promo_code, branch, phone || null, new Date().toISOString());
    
    const newStaff = db.prepare("SELECT * FROM staff WHERE id = ?").get(result.lastInsertRowid);
    
    // Send notification to admins
    sendAdminNotification(newStaff);
    
    res.json(newStaff);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  const result: any = {};
  settings.forEach((s: any) => {
    result[s.key] = JSON.parse(s.value);
  });
  res.json(result);
});

app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
  res.json({ success: true });
});

// Tasks API
app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, s.name as assigned_to_name 
    FROM tasks t 
    LEFT JOIN staff s ON t.assigned_to = s.id
    ORDER BY t.due_date ASC
  `).all();
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { title, description, due_date, assigned_to } = req.body;
  const result = db.prepare(`
    INSERT INTO tasks (title, description, due_date, assigned_to, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, description, due_date, assigned_to || null, new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { status, title, description, due_date, assigned_to } = req.body;
  
  if (status) {
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, id);
  } else {
    db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, due_date = ?, assigned_to = ? 
      WHERE id = ?
    `).run(title, description, due_date, assigned_to, id);
  }
  res.json({ success: true });
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/staff", (req, res) => {
  const { promoCode, id } = req.query;
  if (id) {
    const staff = db.prepare("SELECT * FROM staff WHERE id = ?").get(id);
    return res.json(staff || null);
  }
  if (promoCode) {
    const staff = db.prepare("SELECT * FROM staff WHERE promo_code = ?").get(promoCode);
    return res.json(staff || null);
  }
  const staff = db.prepare("SELECT * FROM staff").all();
  res.json(staff);
});

app.post("/api/staff", (req, res) => {
  const { name, email, role, promo_code, staff_id_code, branch, department, position, date_joined, phone } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO staff (name, email, role, promo_code, staff_id_code, branch, department, position, date_joined, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, role, promo_code, staff_id_code, branch, department, position, date_joined || new Date().toISOString(), phone || null);
    res.json({ id: result.lastInsertRowid });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: "Email or Promo Code already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.patch("/api/staff/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, role, promo_code, staff_id_code, branch, department, position, employment_status, phone } = req.body;
  try {
    db.prepare(`
      UPDATE staff 
      SET name = ?, email = ?, role = ?, promo_code = ?, staff_id_code = ?, branch = ?, department = ?, position = ?, employment_status = ?, phone = ?
      WHERE id = ?
    `).run(name, email, role, promo_code, staff_id_code, branch, department, position, employment_status, phone, id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: "Email or Promo Code already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.post("/api/staff/:id/reset-password", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE staff SET password = 'password123' WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/staff/:id/approve", (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;
  db.prepare("UPDATE staff SET is_approved = ? WHERE id = ?").run(is_approved ? 1 : 0, id);
  res.json({ success: true });
});

app.patch("/api/staff/:id/profile", (req, res) => {
  const { id } = req.params;
  const { nickname, profile_picture, bank_name, bank_account_number } = req.body;
  db.prepare(`
    UPDATE staff 
    SET nickname = ?, profile_picture = ?, bank_name = ?, bank_account_number = ?
    WHERE id = ?
  `).run(nickname, profile_picture, bank_name, bank_account_number, id);
  
  const updatedStaff = db.prepare("SELECT * FROM staff WHERE id = ?").get(id);
  res.json(updatedStaff);
});

app.delete("/api/staff/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM staff WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/services", (req, res) => {
  const services = db.prepare("SELECT * FROM services").all();
  res.json(services.map((s: any) => ({
    ...s,
    allowances: JSON.parse(s.allowances_json || '{}')
  })));
});

app.post("/api/services", (req, res) => {
  const { name, base_price, commission_rate, aracoins_perk, allowances } = req.body;
  const result = db.prepare(`
    INSERT INTO services (name, base_price, commission_rate, aracoins_perk, allowances_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, base_price, commission_rate, aracoins_perk || 0, JSON.stringify(allowances || {}));
  res.json({ id: result.lastInsertRowid });
});

app.patch("/api/services/:id", (req, res) => {
  const { id } = req.params;
  const { name, base_price, commission_rate, aracoins_perk, allowances } = req.body;
  db.prepare(`
    UPDATE services 
    SET name = ?, base_price = ?, commission_rate = ?, aracoins_perk = ?, allowances_json = ?
    WHERE id = ?
  `).run(name, base_price, commission_rate, aracoins_perk || 0, JSON.stringify(allowances || {}), id);
  res.json({ success: true });
});

app.delete("/api/services/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM services WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/referrals", (req, res) => {
  const { staffId, branch } = req.query;
  let query = `
    SELECT r.*, s.name as staff_name, s.promo_code, sv.name as service_name 
    FROM referrals r
    JOIN staff s ON r.staff_id = s.id
    JOIN services sv ON r.service_id = sv.id
  `;
  const params = [];
  const conditions = [];

  if (staffId) {
    conditions.push("r.staff_id = ?");
    params.push(staffId);
  }
  if (branch && branch !== 'all') {
    conditions.push("r.branch = ?");
    params.push(branch);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY r.date DESC";
  const referrals = db.prepare(query).all(...params);
  res.json(referrals);
});

app.post("/api/referrals", (req, res) => {
  const { staff_id, service_id, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, date, created_by, branch } = req.body;
  
  const staff = db.prepare("SELECT * FROM staff WHERE id = ?").get(staff_id) as any;
  if (!staff) return res.status(400).json({ error: "Referrer not found" });

  // Anti-fraud rules
  const fraudFlags = [];
  if (staff.staff_id_code === patient_ic) fraudFlags.push("Self-referral (IC match)");
  if (staff.phone === patient_phone) fraudFlags.push("Self-referral (Phone match)");
  
  // Check for repeated surname (simplified)
  const surname = patient_name.split(' ').pop();
  const similarReferrals = db.prepare("SELECT COUNT(*) as count FROM referrals WHERE patient_name LIKE ? AND staff_id = ?").get(`%${surname}`, staff_id) as { count: number };
  if (similarReferrals.count >= 3) fraudFlags.push("Repeated surname pattern");

  // Check daily volume
  const dailyCount = db.prepare("SELECT COUNT(*) as count FROM referrals WHERE staff_id = ? AND date = ?").get(staff_id, date) as { count: number };
  if (dailyCount.count >= 5) fraudFlags.push("High daily volume (>5)");

  const service = db.prepare("SELECT commission_rate FROM services WHERE id = ?").get(service_id) as { commission_rate: number };
  if (!service) return res.status(400).json({ error: "Service not found" });

  const result = db.prepare(`
    INSERT INTO referrals (staff_id, service_id, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, date, status, commission_amount, fraud_flags, created_by, branch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(staff_id, service_id, patient_name, patient_phone || null, patient_ic || null, patient_address || null, patient_type || 'new', appointment_date || null, booking_time || null, date, 'entered', service.commission_rate, JSON.stringify(fraudFlags), created_by || null, branch || staff.branch);

  // Update staff pending earnings
  db.prepare("UPDATE staff SET pending_earnings = pending_earnings + ? WHERE id = ?").run(service.commission_rate, staff_id);

  res.json({ id: result.lastInsertRowid, fraudFlags });
});

app.patch("/api/referrals/:id", (req, res) => {
  const { id } = req.params;
  const { status, payment_status, visit_date, verified_by, rejection_reason } = req.body;
  
  db.transaction(() => {
    const referral = db.prepare("SELECT * FROM referrals WHERE id = ?").get(id) as any;
    if (!referral) return;

    const updates: string[] = [];
    const params: any[] = [];

    if (status) { updates.push("status = ?"); params.push(status); }
    if (payment_status) { updates.push("payment_status = ?"); params.push(payment_status); }
    if (visit_date) { updates.push("visit_date = ?"); params.push(visit_date); }
    if (verified_by) { updates.push("verified_by = ?"); params.push(verified_by); }
    if (rejection_reason) { updates.push("rejection_reason = ?"); params.push(rejection_reason); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE referrals SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }

    // Logic for status transitions
    if (status === 'approved' && referral.status !== 'approved') {
      // Move from pending to approved
      db.prepare("UPDATE staff SET pending_earnings = pending_earnings - ?, approved_earnings = approved_earnings + ?, lifetime_earnings = lifetime_earnings + ? WHERE id = ?").run(referral.commission_amount, referral.commission_amount, referral.commission_amount, referral.staff_id);
    } else if (status === 'payout_processed' && referral.status !== 'payout_processed') {
      // Move from approved to paid
      db.prepare("UPDATE staff SET approved_earnings = approved_earnings - ?, paid_earnings = paid_earnings + ?, last_payout_date = ? WHERE id = ?").run(referral.commission_amount, referral.commission_amount, new Date().toISOString(), referral.staff_id);
    } else if (status === 'rejected' && referral.status !== 'rejected') {
      // Deduct from pending if it was pending
      if (referral.status === 'entered' || referral.status === 'completed' || referral.status === 'paid_completed' || referral.status === 'buffer') {
        db.prepare("UPDATE staff SET pending_earnings = pending_earnings - ? WHERE id = ?").run(referral.commission_amount, referral.staff_id);
      }
    }
  })();
  
  res.json({ success: true });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "An unexpected error occurred on the server."
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
