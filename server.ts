import express from "express";
import { createClient } from '@supabase/supabase-js';
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import cors from 'cors';
import dotenv from 'dotenv';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!fs.existsSync(path.join(__dirname, '.env')) && !process.env.VITE_SUPABASE_URL) {
  console.warn('WARNING: .env file not found and environment variables are missing.');
}

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('--- Database Configuration ---');
console.log('URL:', supabaseUrl ? 'Configured' : 'MISSING');
console.log('Key:', supabaseKey ? 'Configured' : 'MISSING');
if (process.env.SUPABASE_SERVICE_ROLE_KEY) console.log('Using: Service Role Key');
else if (process.env.VITE_SUPABASE_ANON_KEY) console.log('Using: Anon Key');
console.log('------------------------------');

let supabase: any = null;
let referralColumns: Set<string> = new Set();
let serviceColumns: Set<string> = new Set();

const logError = (context: string, error: any) => {
  console.error(`[${context}] Error:`, error);
  if (error) {
    try {
      const details = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
      console.error(`[${context}] Details:`, details);
    } catch (e) {
      console.error(`[${context}] Could not stringify error:`, e);
    }
  }
};

const checkSupabase = (res: express.Response) => {
  if (!supabase) {
    res.status(503).json({ error: "Database connection not initialized. Please check environment variables." });
    return false;
  }
  return true;
};

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: Supabase environment variables are missing!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');
  } catch (err: any) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendAdminNotification(newUser: any) {
  if (!resend) {
    console.log('RESEND_API_KEY not found. Skipping email notification.');
    return;
  }

  try {
    const { data: admins, error } = await supabase
      .from('staff')
      .select('email')
      .eq('role', 'admin');

    if (error) {
      logError('Admin Notification Fetch', error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log('No admin users found to notify.');
      return;
    }

    const adminEmails = admins.map(a => a.email);

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

// Seed Supabase if empty
async function seedSupabase() {
  if (!supabase) {
    console.log('Supabase client not initialized. Skipping seed.');
    return;
  }
  
  try {
    console.log('Checking if Supabase needs seeding...');
    const { count, error: countError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });

    // Check other critical tables
    const tables = ['branches', 'services', 'settings', 'referrals'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
      if (tableError && (tableError.code === '42P01' || tableError.message.includes('does not exist') || tableError.message.includes('schema cache'))) {
        console.error(`CRITICAL: Table "${table}" is missing in Supabase!`);
      }
    }

    if (countError) {
      if (countError.code === 'PGRST116' || countError.message.includes('relation "staff" does not exist')) {
        console.error('ERROR: The "staff" table does not exist in Supabase. Please run the SQL schema provided.');
      } else {
        console.error('Error checking staff count:', countError);
      }
      return;
    }

    if (count === 0) {
      console.log('Seeding initial data to Supabase...');
      const now = new Date().toISOString();
      
      const initialBranches = [
        { name: "HQ", location: "Kuala Lumpur" },
        { name: "Bangi", location: "Selangor" },
        { name: "Kajang", location: "Selangor" }
      ];

      const { error: branchInsertError } = await supabase.from('branches').insert(initialBranches);
      if (branchInsertError) logError('Seed Branches', branchInsertError);

      const initialStaff = [
        { name: "Admin User", email: "admin@clinic.com", password: "password123", role: "admin", promo_code: "ARA-ADMIN1", branch: "HQ", staff_id_code: "STF-001", date_joined: now, is_approved: 1 },
        { name: "Amir", email: "amir@clinic.com", password: "password123", role: "staff", promo_code: "ARA-AMIR22", branch: "Bangi", staff_id_code: "STF-002", date_joined: now, is_approved: 1 },
        { name: "Sarah", email: "sarah@clinic.com", password: "password123", role: "staff", promo_code: "ARA-SARAH3", branch: "Kajang", staff_id_code: "STF-003", date_joined: now, is_approved: 1 },
        { name: "Receptionist Sarah", email: "sarah_rec@clinic.com", password: "password123", role: "receptionist", promo_code: "ARA-REC444", branch: "Bangi", staff_id_code: "STF-004", date_joined: now, is_approved: 1 },
        { name: "Paige", email: "paige@clinic.com", password: "password123", role: "staff", promo_code: "ARA-PAIGE5", branch: "HQ", staff_id_code: "STF-005", date_joined: now, is_approved: 1 }
      ];

      const { error: staffInsertError } = await supabase.from('staff').insert(initialStaff);
      if (staffInsertError) logError('Seed Staff', staffInsertError);

      const initialServices = [
        { name: "Basic Health Screening", base_price: 80, commission_rate: 5, aracoins_perk: 10 },
        { name: "Comprehensive Screening", base_price: 150, commission_rate: 5, aracoins_perk: 20 },
        { name: "Vaccination Package", base_price: 120, commission_rate: 5, aracoins_perk: 15 }
      ].map(s => {
        const service: any = { ...s };
        if (!serviceColumns.has('aracoins_perk')) {
          delete service.aracoins_perk;
        }
        return service;
      });

      const { error: serviceInsertError } = await supabase.from('services').insert(initialServices);
      if (serviceInsertError) logError('Seed Services', serviceInsertError);
      
      console.log('Seeding complete.');
    } else {
      console.log(`Supabase already has ${count} staff members. Skipping seed.`);
    }
  } catch (error) {
    console.error('Failed to seed Supabase:', error);
  }
}

seedSupabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;

// Middleware to check Supabase initialization
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/debug/supabase") {
    return next();
  }
  
  if (!supabase) {
    console.warn(`Database connection not initialized for request: ${req.path}`);
    return res.status(503).json({ 
      error: "Database connection not initialized.",
      details: "The server is missing Supabase environment variables or initialization is in progress.",
      config: {
        url: supabaseUrl ? 'SET' : 'MISSING',
        key: supabaseKey ? 'SET' : 'MISSING'
      }
    });
  }
  next();
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "An unexpected error occurred" 
  });
});

// Branch Management Routes
app.get("/api/branches", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { data, error } = await supabase.from('branches').select('*').order('name');
  if (error) {
    const isMissingTable = error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('does not exist');
    if (isMissingTable) {
      console.warn('⚠️ [GET /api/branches] The "branches" table is missing in Supabase.');
      return res.status(412).json({ 
        error: "The branches table does not exist.", 
        code: error.code,
        isMissingTable: true 
      });
    }
    logError('GET /api/branches', error);
    return res.status(500).json({ 
      error: error.message, 
      code: error.code
    });
  }
  res.json(data);
});

app.post("/api/branches", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { name, location } = req.body;
  const { data, error } = await supabase.from('branches').insert({ name, location }).select().single();
  if (error) {
    logError('POST /api/branches', error);
    return res.status(500).json({ error: error.message, details: error });
  }
  res.json(data);
});

app.put("/api/branches/:id", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { id } = req.params;
  const { name, location } = req.body;
  const { data, error } = await supabase.from('branches').update({ name, location }).eq('id', id).select().single();
  if (error) {
    logError('PUT /api/branches', error);
    return res.status(500).json({ error: error.message, details: error });
  }
  res.json(data);
});

app.delete("/api/branches/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/branches/:name/performance", async (req, res) => {
  const { name } = req.params;
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('status, commission_earned')
    .eq('branch', name);
  
  if (error) return res.status(500).json({ error: error.message });
  
  const performance = {
    total: referrals.length,
    successful: referrals.filter(r => ['approved', 'payout_processed'].includes(r.status)).length,
    pending: referrals.filter(r => ['entered', 'completed', 'paid_completed', 'buffer'].includes(r.status)).length,
    total_commission: referrals.reduce((sum, r) => sum + (r.commission_earned || 0), 0)
  };
  
  res.json(performance);
});

// Branch Change Requests
app.post("/api/branch-change-requests", async (req, res) => {
  const { staff_id, current_branch, requested_branch, reason } = req.body;
  const { data, error } = await supabase
    .from('branch_change_requests')
    .insert({ 
      staff_id, 
      current_branch, 
      requested_branch, 
      reason,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/branch-change-requests", async (req, res) => {
  const { data, error } = await supabase
    .from('branch_change_requests')
    .select('*, staff:staff_id(name, email)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put("/api/branch-change-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  
  const { data: request, error: fetchError } = await supabase
    .from('branch_change_requests')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  
  if (status === 'approved') {
    const { error: updateStaffError } = await supabase
      .from('staff')
      .update({ branch: request.requested_branch })
      .eq('id', request.staff_id);
      
    if (updateStaffError) return res.status(500).json({ error: updateStaffError.message });
  }
  
  const { data, error } = await supabase
    .from('branch_change_requests')
    .update({ status, admin_notes })
    .eq('id', id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.get("/api/health", async (req, res) => {
  let dbStatus = "unknown";
  if (!supabase) {
    dbStatus = "not_initialized";
  } else {
    try {
      const { error } = await supabase.from('staff').select('*', { count: 'exact', head: true });
      if (error) throw error;
      dbStatus = "connected";
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }
  }

  res.json({ 
    status: "ok", 
    db: dbStatus,
    time: new Date().toISOString(),
    vercel: !!process.env.VERCEL,
    env: process.env.NODE_ENV,
    config: {
      url: supabaseUrl ? 'SET' : 'MISSING',
      key: supabaseKey ? 'SET' : 'MISSING'
    }
  });
});

app.get("/api/debug/supabase", async (req, res) => {
  const report: any = {
    url_configured: !!supabaseUrl,
    key_configured: !!supabaseKey,
    client_initialized: !!supabase,
    env_vars: {
      VITE_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    },
    tables: {}
  };

  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Supabase client not initialized', report });
  }

  try {
    // Check staff table
    const { count: staffCount, error: staffError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });
    
    report.tables.staff = staffError ? { status: 'error', error: staffError } : { status: 'ok', count: staffCount };

    // Check services table
    const { count: servicesCount, error: servicesError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });
    
    report.tables.services = servicesError ? { status: 'error', error: servicesError } : { status: 'ok', count: servicesCount };

    // Check branches table
    const { count: branchesCount, error: branchesError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });
    
    report.tables.branches = branchesError ? { status: 'error', error: branchesError } : { status: 'ok', count: branchesCount };

    // Check branch change requests table
    const { count: bcrCount, error: bcrError } = await supabase
      .from('branch_change_requests')
      .select('*', { count: 'exact', head: true });
    
    report.tables.branch_change_requests = bcrError ? { status: 'error', error: bcrError } : { status: 'ok', count: bcrCount };

    // Check settings table
    const { count: settingsCount, error: settingsError } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true });
    
    report.tables.settings = settingsError ? { status: 'error', error: settingsError } : { status: 'ok', count: settingsCount };

    const allOk = !staffError && !servicesError && !settingsError;
    res.json({ 
      status: allOk ? 'ok' : 'partial_error', 
      message: allOk ? 'Supabase connection and schema verified' : 'Some tables are missing or inaccessible',
      report 
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message, report });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`Login failed: User not found or invalid password for ${email}`);
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (error.message?.includes('relation "staff" does not exist')) {
        return res.status(500).json({ error: "Database table 'staff' missing. Please run the SQL schema in Supabase." });
      }
      throw error;
    }

    if (staff) {
      console.log(`Login successful for: ${email}`);
      res.json(staff);
    } else {
      console.log(`Login failed for: ${email}`);
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (error: any) {
    console.error(`Login error for ${email}:`, error);
    res.status(500).json({ error: `Server error: ${error.message || 'Unknown error'}` });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { name, email, branch, phone, password } = req.body;
  console.log(`Registration attempt for: ${email}`, { name, branch, phone });
  
  try {
    // Check if registration is allowed
    console.log('Checking registration settings...');
    const { data: authSetting, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'auth')
      .single();
      
    if (settingsError && settingsError.code !== 'PGRST116') {
      logError('Registration Settings Check', settingsError);
    }
    
    const settings = authSetting ? JSON.parse(authSetting.value) : { allowRegistration: true };
    
    if (!settings.allowRegistration) {
      console.log(`Registration blocked: self-registration disabled for ${email}`);
      return res.status(403).json({ error: "Self-registration is currently disabled. Please contact an administrator." });
    }

    // Generate a random promo code (void of user identity)
    const generateRandomCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = 'ARA-';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let promo_code = generateRandomCode();
    
    // Try to ensure unique promo code
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('staff')
        .select('id')
        .eq('promo_code', promo_code)
        .single();
      if (!existing) break;
      promo_code = generateRandomCode();
      attempts++;
    }

    console.log(`Inserting new staff member: ${email} with promo code ${promo_code}`);
    const { data: newStaff, error: insertError } = await supabase
      .from('staff')
      .insert({
        name,
        email,
        role: 'staff',
        promo_code,
        branch,
        phone: phone || null,
        date_joined: new Date().toISOString(),
        is_approved: 0,
        password: password || 'password123'
      })
      .select()
      .single();
    
    if (insertError) {
      logError('Supabase Registration Insert', insertError);
      throw insertError;
    }

    console.log(`Registration successful for: ${email}, ID: ${newStaff.id}`);
    
    // Send notification to admins (don't await to avoid blocking response)
    sendAdminNotification(newStaff).catch(err => console.error('Background notification error:', err));
    
    res.json(newStaff);
  } catch (error: any) {
    logError(`Registration error for ${email}`, error);
    if (error.code === '23505') { // Unique constraint violation in Postgres
      res.status(400).json({ error: `Email or Promo Code already exists. Please try again.` });
    } else if (error.code === 'PGRST116' || error.message?.includes('relation "staff" does not exist')) {
      res.status(500).json({ error: "Database table 'staff' missing. Please run the SQL schema in Supabase." });
    } else {
      res.status(500).json({ error: `Server error: ${error.message || 'Unknown error'}` });
    }
  }
});

app.get("/api/settings", async (req, res) => {
  const { data: settings, error } = await supabase.from('settings').select('*');
  if (error) return res.status(500).json({ error: error.message });
  
  const result: any = {};
  settings.forEach((s: any) => {
    result[s.key] = JSON.parse(s.value);
  });
  res.json(result);
});

app.get("/api/promotions", async (req, res) => {
  console.log('GET /api/promotions');
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'promotions');
      
    if (error) {
      logError('GET /api/promotions', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!settings || settings.length === 0) {
      console.log('No promotions found in settings');
      return res.json([]);
    }
    
    // If multiple rows exist, take the last one (most recent)
    const setting = settings[settings.length - 1];
    const promos = JSON.parse(setting.value);
    console.log(`Returning ${promos.length} promotions from database`);
    console.log('Raw promotions data:', setting.value.substring(0, 100) + '...');
    res.json(promos);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/promotions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/promotions", async (req, res) => {
  const promotions = req.body;
  console.log(`POST /api/promotions - Saving ${promotions.length} promotions`);
  
  try {
    // Delete existing ones first to ensure we only have one row for this key
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .eq('key', 'promotions');

    if (deleteError) {
      console.warn('Warning: Error deleting old promotions (may not exist):', deleteError);
    }

    // Insert new one
    const { error: insertError } = await supabase
      .from('settings')
      .insert({ key: 'promotions', value: JSON.stringify(promotions) });

    if (insertError) {
      logError('POST /api/promotions', insertError);
      return res.status(500).json({ error: insertError.message });
    }
    
    console.log('Promotions saved successfully via delete/insert');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error saving promotions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const { key, value } = req.body;
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: JSON.stringify(value) });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Tasks API
app.get("/api/tasks", async (req, res) => {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      staff:assigned_to (name)
    `)
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  
  const formattedTasks = tasks.map(t => ({
    ...t,
    assigned_to_name: t.staff?.name
  }));
  
  res.json(formattedTasks);
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, due_date, assigned_to } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      due_date,
      assigned_to: assigned_to || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { status, title, description, due_date, assigned_to } = req.body;
  
  const updateData: any = {};
  if (status) updateData.status = status;
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (due_date) updateData.due_date = due_date;
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/staff/email", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email is required" });
  
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .single();
    
  res.json(staff || null);
});

app.get("/api/staff", async (req, res) => {
  const { promoCode, id } = req.query;
  
  let query = supabase.from('staff').select('*');
  
  if (id) {
    const { data, error } = await query.eq('id', id).single();
    return res.json(data || null);
  }
  
  if (promoCode) {
    const { data, error } = await query.eq('promo_code', promoCode).single();
    return res.json(data || null);
  }
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/staff", async (req, res) => {
  const { name, email, role, promo_code, staff_id_code, branch, department, position, date_joined, phone, password } = req.body;
  
  // Generate a random promo code if not provided (void of user identity)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'ARA-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  let final_promo_code = promo_code;
  if (!final_promo_code) {
    final_promo_code = generateRandomCode();
  }

  try {
    const { data, error } = await supabase
      .from('staff')
      .insert({
        name, email, role, promo_code: final_promo_code, staff_id_code, branch, department, position, 
        date_joined: date_joined || new Date().toISOString(), 
        phone: phone || null, 
        password: password || 'password123',
        is_approved: 1 // Manual creation by admin is auto-approved
      })
      .select()
      .single();
      
    if (error) throw error;
    res.json({ id: data.id });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ error: "Email or Promo Code already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.patch("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  
  const allowedFields = [
    'name', 'email', 'role', 'promo_code', 'staff_id_code', 
    'branch', 'department', 'position', 'employment_status', 
    'phone', 'is_approved', 'nickname', 'profile_picture', 
    'bank_name', 'bank_account_number', 'id_type', 'id_number'
  ];

  const updateData: any = {};
  Object.keys(body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = body[key];
    }
  });
  
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields provided for update" });
  }
  
  try {
    const { error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating staff ${id}:`, error);
    if (error.code === '23505') {
      res.status(400).json({ error: "Email or Promo Code already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  const { staffId, currentPassword, newPassword } = req.body;
  
  try {
    const { data: staff, error: fetchError } = await supabase
      .from('staff')
      .select('password')
      .eq('id', staffId)
      .single();
      
    if (fetchError || !staff) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (staff.password !== currentPassword) {
      return res.status(401).json({ error: "Incorrect current password" });
    }
    
    const { error: updateError } = await supabase
      .from('staff')
      .update({ password: newPassword })
      .eq('id', staffId);
      
    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/staff/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('staff')
    .update({ password: 'password123' })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/staff/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;
  
  const updateData: any = { is_approved: is_approved ? 1 : 0 };
  if (is_approved) {
    updateData.employment_status = 'active';
  }
  
  const { error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', id);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.patch("/api/staff/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { nickname, profile_picture, bank_name, bank_account_number } = req.body;
  
  const { data, error } = await supabase
    .from('staff')
    .update({ nickname, profile_picture, bank_name, bank_account_number })
    .eq('id', id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('staff').update({ employment_status: 'deleted' }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/staff/:id/restore", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('staff').update({ employment_status: 'permanent' }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/staff/:id/permanent", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/services", async (req, res) => {
  const { data: services, error } = await supabase.from('services').select('*');
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(services.map((s: any) => ({
    ...s,
    allowances: JSON.parse(s.allowances_json || '{}')
  })));
});

app.post("/api/services", async (req, res) => {
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, posters, promo_price, type, branches } = req.body;
  
  const insertData: any = {
    name,
    base_price,
    commission_rate,
    allowances_json: JSON.stringify(allowances || {}),
    description,
    posters: JSON.stringify(posters || []),
    promo_price,
    type,
    branches: JSON.stringify(branches || [])
  };

  if (serviceColumns.has('aracoins_perk')) {
    insertData.aracoins_perk = aracoins_perk || 0;
  }

  const { data, error } = await supabase
    .from('services')
    .insert(insertData)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.patch("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, posters, promo_price, type, branches } = req.body;
  
  const updateData: any = {
    name,
    base_price,
    commission_rate,
    allowances_json: JSON.stringify(allowances || {}),
    description,
    posters: JSON.stringify(posters || []),
    promo_price,
    type,
    branches: JSON.stringify(branches || [])
  };

  if (serviceColumns.has('aracoins_perk')) {
    updateData.aracoins_perk = aracoins_perk || 0;
  }

  const { error } = await supabase
    .from('services')
    .update(updateData)
    .eq('id', id);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/referrals", async (req, res) => {
  const { staffId, branch, requesterRole, requesterBranch } = req.query;
  
  let query = supabase
    .from('referrals')
    .select(`
      *,
      staff:staff_id (name, promo_code),
      service:service_id (name)
    `)
    .order('date', { ascending: false });

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }
  
  // Receptionist restriction: can only see referrals to their branch
  if (requesterRole === 'receptionist') {
    query = query.eq('branch', requesterBranch);
  } else if (branch && branch !== 'all') {
    query = query.eq('branch', branch);
  }

  const { data: referrals, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  const formattedReferrals = referrals.map(r => ({
    ...r,
    staff_name: r.staff?.name,
    promo_code: r.staff?.promo_code,
    service_name: r.service?.name
  }));
  
  res.json(formattedReferrals);
});

app.post("/api/referrals", async (req, res) => {
  const { staff_id, service_id, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, date, created_by, branch } = req.body;
  
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staff_id)
    .single();
    
  if (staffError || !staff) return res.status(400).json({ error: "Referrer not found" });

  // Anti-fraud rules
  const fraudFlags = [];
  if (staff.staff_id_code === patient_ic) fraudFlags.push("Self-referral (IC match)");
  if (staff.phone === patient_phone) fraudFlags.push("Self-referral (Phone match)");
  
  const surname = patient_name.split(' ').pop();
  const { count: similarCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .ilike('patient_name', `%${surname}`)
    .eq('staff_id', staff_id);
    
  if (similarCount && similarCount >= 3) fraudFlags.push("Repeated surname pattern");

  const { count: dailyCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', staff_id)
    .eq('date', date);
    
  if (dailyCount && dailyCount >= 5) fraudFlags.push("High daily volume (>5)");

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('commission_rate, aracoins_perk')
    .eq('id', service_id)
    .single();
    
  if (serviceError || !service) return res.status(400).json({ error: "Service not found" });

  const insertData: any = {
    staff_id,
    service_id,
    patient_name,
    patient_phone: patient_phone || null,
    patient_ic: patient_ic || null,
    patient_address: patient_address || null,
    patient_type: patient_type || 'new',
    appointment_date: appointment_date || null,
    booking_time: booking_time || null,
    date,
    status: 'entered',
    commission_amount: service.commission_rate,
    fraud_flags: JSON.stringify(fraudFlags),
    created_by: created_by || null,
    branch: staff.branch // Referral will go to the assigned branch only
  };

  // Only include aracoins_perk if the column exists in the database
  if (referralColumns.has('aracoins_perk')) {
    insertData.aracoins_perk = service.aracoins_perk || 0;
  }

  const { data: referral, error: insertError } = await supabase
    .from('referrals')
    .insert(insertData)
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  // Update staff pending earnings
  await supabase
    .from('staff')
    .update({ pending_earnings: (staff.pending_earnings || 0) + service.commission_rate })
    .eq('id', staff_id);

  res.json({ id: referral.id, fraudFlags });
});

app.patch("/api/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const { status, payment_status, visit_date, verified_by, rejection_reason } = req.body;
  
  const { data: referral, error: fetchError } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError || !referral) return res.status(404).json({ error: "Referral not found" });

  const updateData: any = {};
  if (status) updateData.status = status;
  if (payment_status) updateData.payment_status = payment_status;
  if (visit_date) updateData.visit_date = visit_date;
  if (verified_by) updateData.verified_by = verified_by;
  if (rejection_reason) updateData.rejection_reason = rejection_reason;

  const { error: updateError } = await supabase
    .from('referrals')
    .update(updateData)
    .eq('id', id);
    
  if (updateError) return res.status(500).json({ error: updateError.message });

  // Logic for status transitions
  const { data: staff } = await supabase.from('staff').select('*').eq('id', referral.staff_id).single();
  if (!staff) return res.json({ success: true });

  if (status === 'approved' && referral.status !== 'approved') {
    const staffUpdate: any = { 
      pending_earnings: (staff.pending_earnings || 0) - referral.commission_amount,
      approved_earnings: (staff.approved_earnings || 0) + referral.commission_amount,
      lifetime_earnings: (staff.lifetime_earnings || 0) + referral.commission_amount
    };
    
    // Only update aracoins if the column existed in the referral record
    if (referral.aracoins_perk !== undefined) {
      staffUpdate.aracoins = (staff.aracoins || 0) + (referral.aracoins_perk || 0);
    }

    await supabase
      .from('staff')
      .update(staffUpdate)
      .eq('id', referral.staff_id);
  } else if (status === 'payout_processed' && referral.status !== 'payout_processed') {
    await supabase
      .from('staff')
      .update({ 
        approved_earnings: (staff.approved_earnings || 0) - referral.commission_amount,
        paid_earnings: (staff.paid_earnings || 0) + referral.commission_amount,
        last_payout_date: new Date().toISOString()
      })
      .eq('id', referral.staff_id);
  } else if (status === 'rejected' && referral.status !== 'rejected') {
    if (['entered', 'completed', 'paid_completed', 'buffer'].includes(referral.status)) {
      await supabase
        .from('staff')
        .update({ pending_earnings: (staff.pending_earnings || 0) - referral.commission_amount })
        .eq('id', referral.staff_id);
    }
  }
  
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
  console.log('Starting server initialization...');
  
  // Detect columns in background
  if (supabase) {
    supabase.from('referrals').select().limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        referralColumns = new Set(Object.keys(data[0]));
        console.log('Detected referral columns:', Array.from(referralColumns));
      }
    }).catch(err => console.warn('Referral column detection failed:', err));

    supabase.from('services').select().limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        serviceColumns = new Set(Object.keys(data[0]));
        console.log('Detected service columns:', Array.from(serviceColumns));
      }
    }).catch(err => console.warn('Service column detection failed:', err));
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log('Initializing Vite middleware...');
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized.');
    } catch (err) {
      console.error('Failed to initialize Vite middleware:', err);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.get("/api/diag", async (req, res) => {
  const diag: any = {
    supabaseInitialized: !!supabase,
    env: {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
    },
    tables: {}
  };
  
  if (supabase) {
    const tableList = ['staff', 'branches', 'referrals', 'services', 'tasks', 'settings', 'promotions', 'branch_change_requests'];
    
    for (const table of tableList) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        diag.tables[table] = error ? { error: error.message, code: error.code } : { exists: true, count };
      } catch (e: any) {
        diag.tables[table] = { error: e.message };
      }
    }
  }
  
  res.json(diag);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});

export default app;
