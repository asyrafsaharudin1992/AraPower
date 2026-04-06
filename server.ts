import express from "express";
import { createClient } from '@supabase/supabase-js';
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";
import * as cheerio from 'cheerio';

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

// Mock Supabase for local development without credentials
class MockSupabase {
  private data: any = {
    staff: [],
    branches: [],
    services: [],
    settings: [
      { key: 'auth', value: JSON.stringify({ allowRegistration: true }) }
    ],
    referrals: [],
    warm_leads: [],
    tasks: [],
    notifications: [],
    branch_change_requests: [],
    feedback: []
  };

  from(table: string) {
    if (!this.data[table]) this.data[table] = [];
    return new MockQuery(this.data[table], table, this.data);
  }

  auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Mock Auth Not Implemented') }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Mock Auth Not Implemented') }),
  };

  storage = {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://picsum.photos/seed/${path}/200` } }),
      upload: async () => ({ data: { path: 'mock-path' }, error: null })
    })
  };

  rpc = async (fn: string, args?: any) => ({ data: null, error: new Error('Mock RPC Not Implemented') });
}

class MockQuery {
  private filters: any[] = [];
  private orderCol: string | null = null;
  private limitCount: number | null = null;

  private items: any[];
  private table: string;
  private allData: any;

  constructor(items: any[], table: string, allData: any) {
    this.items = items;
    this.table = table;
    this.allData = allData;
  }

  select(cols: string = '*', options: any = {}) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item: any) => item[col] == val);
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push((item: any) => item[col] != val);
    return this;
  }

  ilike(col: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this.filters.push((item: any) => regex.test(item[col]));
    return this;
  }

  or(filter: string) {
    // Simple mock for common OR patterns
    return this;
  }

  order(col: string, options: any = {}) {
    this.orderCol = col;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  private getFiltered() {
    let result = [...this.items];
    this.filters.forEach(f => {
      result = result.filter(f);
    });
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  async single() {
    const filtered = this.getFiltered();
    return { data: filtered[0] || null, error: filtered[0] ? null : { code: 'PGRST116', message: 'Not found' } };
  }

  // Support for await query
  async then(resolve: any, reject: any) {
    try {
      const filtered = this.getFiltered();
      resolve({ data: filtered, error: null, count: filtered.length });
    } catch (err) {
      resolve({ data: [], error: err });
    }
  }

  insert(data: any) {
    const itemsToInsert = Array.isArray(data) ? data : [data];
    const inserted = itemsToInsert.map(item => {
      const newItem = { 
        id: item.id || Math.floor(Math.random() * 1000000), 
        created_at: new Date().toISOString(),
        ...item 
      };
      this.items.push(newItem);
      return newItem;
    });
    
    // For single insert, return a query that can .select().single()
    return new MockQuery(inserted, this.table, this.allData);
  }

  update(data: any) {
    const filtered = this.getFiltered();
    filtered.forEach(item => {
      Object.assign(item, data);
    });
    return new MockQuery(filtered, this.table, this.allData);
  }

  delete() {
    const filtered = this.getFiltered();
    const idsToDelete = filtered.map(i => i.id);
    const tableData = this.allData[this.table];
    this.allData[this.table] = tableData.filter((i: any) => !idsToDelete.includes(i.id));
    return new MockQuery([], this.table, this.allData);
  }
}

let supabase: any = null;
let referralColumns: Set<string> = new Set([
  'id', 'patient_name', 'status', 'created_at',
  'patient_phone', 'patient_ic', 'patient_address', 'patient_type',
  'appointment_date', 'booking_time', 'fraud_flags', 'created_by',
  'branch', 'aracoins_perk', 'service_id', 'deposit_paid',
  'staff_id', 'referral_code', 'commission_amount', 'service_name'
]);
let serviceColumns: Set<string> = new Set([
  'id', 'name', 'category', 'type', 'description', 'base_price',
  'promo_price', 'aracoins_perk', 'is_featured', 'image_url',
  'branches', 'start_date', 'end_date', 'start_time', 'end_time',
  'duration_mins', 'created_at', 'target_url', 'commission_rate'
]);
let staffColumns: Set<string> = new Set(['id', 'name', 'email', 'role', 'created_at']);
let taskColumns: Set<string> = new Set(['id', 'title', 'status']);
let branchColumns: Set<string> = new Set(['id', 'name', 'location', 'whatsapp_number']);
let settingsColumns: Set<string> = new Set(['key', 'value']);
let notificationColumns: Set<string> = new Set(['id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at']);
let branchChangeRequestColumns: Set<string> = new Set(['id', 'staff_id', 'status']);

async function discoverColumns() {
  if (!supabase) return;
  const tables = [
    { name: 'services', set: serviceColumns },
    { name: 'referrals', set: referralColumns },
    { name: 'staff', set: staffColumns },
    { name: 'tasks', set: taskColumns },
    { name: 'branches', set: branchColumns },
    { name: 'settings', set: settingsColumns },
    { name: 'notifications', set: notificationColumns },
    { name: 'branch_change_requests', set: branchChangeRequestColumns }
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table.name).select('*').limit(1);
      if (!error && data && data.length > 0) {
        Object.keys(data[0]).forEach(key => table.set.add(key));
        console.log(`[Discovery] Found columns for ${table.name}:`, Array.from(table.set));
      } else if (error) {
        console.warn(`[Discovery] Could not fetch columns for ${table.name}:`, error.message);
      }
    } catch (e) {
      console.error(`[Discovery] Error discovering columns for ${table.name}:`, e);
    }
  }
}

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

const isPlaceholderUrl = (url: string) => {
  if (!url || url.length === 0) return true;
  const placeholders = ['placeholder', 'your-project-url', 'your-project-id', 'your-supabase-url', 'https://.supabase.co'];
  const isPlaceholder = placeholders.some(p => url.toLowerCase().includes(p));
  const isInvalidFormat = !url.toLowerCase().startsWith('http');
  return isPlaceholder || isInvalidFormat;
};

const isPlaceholderKey = (key: string) => {
  if (!key || key.length === 0) return true;
  const placeholders = ['placeholder', 'your-anon-key', 'your-supabase-key', 'your-service-role-key'];
  const isPlaceholder = placeholders.some(p => key.toLowerCase().includes(p));
  const isTooShort = key.length < 20;
  return isPlaceholder || isTooShort;
};

if (isPlaceholderUrl(supabaseUrl) || isPlaceholderKey(supabaseKey)) {
  console.warn('Supabase environment variables are missing or using placeholders!');
  console.warn('URL:', supabaseUrl || 'MISSING');
  console.warn('Key:', supabaseKey ? 'SET (Hidden)' : 'MISSING');
  console.log('Initializing Mock Supabase for local development...');
  supabase = new MockSupabase();
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
        }
      }
    });
    console.log('Supabase client initialized successfully.');
    if (supabaseKey.length < 100) {
      console.warn('WARNING: The Supabase Key seems too short. Ensure you are using the full Service Role or Anon key.');
    }
  } catch (err: any) {
    console.error('Failed to initialize Supabase client:', err.message);
    console.log('Falling back to Mock Supabase...');
    supabase = new MockSupabase();
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
        { name: "Admin User", email: "admin@clinic.com", role: "admin" },
        { name: "Amir", email: "amir@clinic.com", role: "staff" },
        { name: "Sarah", email: "sarah@clinic.com", role: "staff" },
        { name: "Receptionist Sarah", email: "sarah_rec@clinic.com", role: "receptionist" },
        { name: "Paige", email: "paige@clinic.com", role: "staff" }
      ].map(staff => {
        const data: any = { ...staff };
        if (staffColumns.has('password')) data.password = "password123";
        if (staffColumns.has('promo_code')) data.promo_code = `ARA-${staff.name.toUpperCase().replace(' ', '')}1`;
        if (staffColumns.has('branch')) data.branch = "HQ";
        if (staffColumns.has('staff_id_code')) data.staff_id_code = `STF-${Math.floor(Math.random() * 1000)}`;
        if (staffColumns.has('date_joined')) data.date_joined = now;
        if (staffColumns.has('is_approved')) data.is_approved = 1;
        return data;
      });

      const { error: staffInsertError } = await supabase.from('staff').insert(initialStaff);
      if (staffInsertError) logError('Seed Staff', staffInsertError);

      const initialServices = [
        { name: "Basic Health Screening", base_price: 80, commission_rate: 5, aracoins_perk: 10, is_featured: false, category: "Health screening", branches: JSON.stringify(["HQ", "Bangi", "Kajang"]) },
        { name: "Comprehensive Screening", base_price: 150, commission_rate: 5, aracoins_perk: 20, is_featured: true, category: "Health screening", branches: JSON.stringify(["HQ", "Bangi", "Kajang"]) },
        { name: "Vaccination Package", base_price: 120, commission_rate: 5, aracoins_perk: 15, is_featured: false, category: "Vaccination", branches: JSON.stringify(["HQ", "Bangi", "Kajang"]) }
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

seedSupabase().then(() => discoverColumns());

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
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
  const selectColumns = Array.from(branchColumns).length > 0 ? Array.from(branchColumns).join(',') : '*';
  const { data, error } = await supabase.from('branches').select(selectColumns).order('name');
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
  const { name, location, whatsapp_number } = req.body;
  const { data, error } = await supabase.from('branches').insert({ name, location, whatsapp_number }).select().single();
  if (error) {
    logError('POST /api/branches', error);
    return res.status(500).json({ error: error.message, details: error });
  }
  res.json(data);
});

app.put("/api/branches/:id", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { id } = req.params;
  const { name, location, whatsapp_number } = req.body;
  const { data, error } = await supabase.from('branches').update({ name, location, whatsapp_number }).eq('id', id).select().single();
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

app.post("/api/import-service", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // 1. Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    const html = await response.text();

    // 2. Parse HTML with Cheerio
    const $ = cheerio.load(html);

    // Extract Metadata
    const name = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';

    // Extract Price using Regex (RM\s*\d+)
    // We look for RM followed by digits, potentially with decimals
    const priceMatch = html.match(/RM\s*(\d+(?:[.,]\d{2})?)/i);
    let price = 0;
    if (priceMatch && priceMatch[1]) {
      price = parseFloat(priceMatch[1].replace(',', '.'));
    }

    res.json({
      name: name.trim(),
      description: description.trim(),
      image: image,
      price: price
    });

  } catch (error: any) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/branches/:name/performance", async (req, res) => {
  const { name } = req.params;
  
  let selectCols = 'status';
  if (referralColumns.has('commission_earned')) selectCols += ', commission_earned';
  
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(selectCols)
    .eq('branch', name);
  
  if (error) return res.status(500).json({ error: error.message });
  
  const performance = {
    total: referrals.length,
    successful: referrals.filter(r => ['approved', 'payout_processed'].includes(r.status)).length,
    pending: referrals.filter(r => ['entered', 'completed', 'paid_completed'].includes(r.status)).length,
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
  const selectColumns = Array.from(branchChangeRequestColumns).length > 0 
    ? Array.from(branchChangeRequestColumns).join(',') 
    : '*';

  const { data: requests, error } = await supabase
    .from('branch_change_requests')
    .select(selectColumns)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  if (!requests || requests.length === 0) return res.json([]);

  const staffIds = [...new Set(requests.map(r => r.staff_id).filter(Boolean))];
  const { data: staffData } = await supabase.from('staff').select('id, name, email').in('id', staffIds);
  const staffMap = Object.fromEntries((staffData || []).map(s => [s.id, s]));

  const formattedRequests = requests.map(r => ({
    ...r,
    staff: staffMap[r.staff_id] || null
  }));

  res.json(formattedRequests);
});

app.put("/api/branch-change-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  
  const selectColumns = Array.from(branchChangeRequestColumns).length > 0 
    ? Array.from(branchChangeRequestColumns).join(',') 
    : '*';

  const { data: request, error: fetchError } = await supabase
    .from('branch_change_requests')
    .select(selectColumns)
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
  let errorDetails = null;
  
  if (!supabase) {
    dbStatus = "not_initialized";
  } else if (supabase instanceof MockSupabase) {
    dbStatus = "mock_mode";
  } else {
    try {
      const { error } = await supabase.from('staff').select('id', { count: 'exact', head: true });
      if (error) {
        dbStatus = "error";
        errorDetails = error.message;
      } else {
        dbStatus = "connected";
      }
    } catch (e: any) {
      dbStatus = "exception";
      errorDetails = e.message;
    }
  }

  res.json({ 
    status: "ok", 
    db: dbStatus,
    error: errorDetails,
    time: new Date().toISOString(),
    vercel: !!process.env.VERCEL,
    env: process.env.NODE_ENV,
    config: {
      url: supabaseUrl ? `SET (${supabaseUrl.substring(0, 20)}...)` : 'MISSING',
      key: supabaseKey ? `SET (Length: ${supabaseKey.length})` : 'MISSING',
      isPlaceholder: isPlaceholderUrl(supabaseUrl) || isPlaceholderKey(supabaseKey),
      urlValidFormat: supabaseUrl ? supabaseUrl.startsWith('http') : false,
      viteUrl: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      viteAnonKey: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
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
    let selectColumns = 'id, name, email, role';
    const optionalColumns = ['staff_id_code', 'branch', 'department', 'position', 'employment_status', 'date_joined', 'pending_earnings', 'approved_earnings', 'paid_earnings', 'lifetime_earnings', 'last_payout_date', 'referrer_type', 'phone', 'aracoins', 'is_approved', 'nickname', 'profile_picture', 'bank_name', 'bank_account_number', 'id_type', 'id_number'];
    
    optionalColumns.forEach(col => {
      if (staffColumns.has(col)) {
        selectColumns += `, ${col}`;
      }
    });

    let query = supabase
      .from('staff')
      .select(selectColumns)
      .eq('email', email);
      
    if (staffColumns.has('password')) {
      query = query.eq('password', password);
    }

    const { data: staff, error } = await query.single();

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
      if (staff.employment_status === 'deleted') {
        console.log(`Login failed: Account is deleted for ${email}`);
        return res.status(401).json({ error: "This account has been deleted. Please contact an administrator." });
      }
      console.log(`Login successful for: ${email}`);
      res.json(staff);
    } else {
      console.log(`Login failed for: ${email}`);
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (error: any) {
    console.error(`Login error for ${email}:`, error.message || error);
    res.status(500).json({ error: `Server error: ${error.message || 'Unknown error'}` });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { name, email, branch, phone, password, auth_id } = req.body;
  console.log(`Registration attempt for: ${email}`, { name, branch, phone, auth_id });
  
  try {
    // Initialize admin client to bypass RLS for registration
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let dbClient = supabase;
    let final_auth_id = auth_id;

    if (serviceRoleKey) {
      dbClient = createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Auto-create and confirm user in Supabase Auth if not provided
      if (!final_auth_id) {
        const { data: usersData } = await dbClient.auth.admin.listUsers();
        let authUser = usersData?.users?.find((u: any) => u.email === email);
        
        if (!authUser) {
          const { data: newAuthUser, error: createAuthError } = await dbClient.auth.admin.createUser({
            email,
            password: password || 'password123',
            email_confirm: true,
            user_metadata: { full_name: name, branch }
          });
          if (newAuthUser.user) final_auth_id = newAuthUser.user.id;
        } else {
          final_auth_id = authUser.id;
        }
      }
    }

    // Check if registration is allowed
    console.log('Checking registration settings...');
    const { data: authSetting, error: settingsError } = await dbClient
      .from('settings')
      .select('value')
      .eq('key', 'auth')
      .single();
      
    if (settingsError && settingsError.code !== 'PGRST116' && settingsError.code !== 'PGRST205') {
      logError('Registration Settings Check', settingsError);
    }
    
    let settings = { allowRegistration: true };
    if (authSetting && authSetting.value) {
      try {
        settings = JSON.parse(authSetting.value);
      } catch (e) {
        console.error('Error parsing auth settings:', e);
      }
    }
    
    if (!settings.allowRegistration) {
      console.log(`Registration blocked: self-registration disabled for ${email}`);
      return res.status(403).json({ error: "Self-registration is currently disabled. Please contact an administrator." });
    }

    // Generate a referral code based on first name and a random 3-digit number
    const generateReferralCode = (fullName: string) => {
      const firstName = fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
      const randomNum = Math.floor(100 + Math.random() * 900); // 100 to 999
      return `${firstName}${randomNum}`;
    };

    let referral_code = generateReferralCode(name);
    
    // Try to ensure unique referral code
    let attempts = 0;
    if (staffColumns.has('referral_code')) {
      while (attempts < 10) {
        const { data: existing } = await dbClient
          .from('staff')
          .select('id')
          .eq('referral_code', referral_code)
          .single();
        if (!existing) break;
        referral_code = generateReferralCode(name);
        attempts++;
      }
    } else if (staffColumns.has('promo_code')) {
      // Fallback to promo_code if referral_code doesn't exist yet
      while (attempts < 10) {
        const { data: existing } = await dbClient
          .from('staff')
          .select('id')
          .eq('promo_code', referral_code)
          .single();
        if (!existing) break;
        referral_code = generateReferralCode(name);
        attempts++;
      }
    }

    console.log(`Checking if staff member already exists: ${email}`);
    const { data: existingStaff } = await dbClient
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();

    if (existingStaff) {
      console.log(`Staff member ${email} already exists. Updating auth_id.`);
      
      const updateData: any = {};
      if (final_auth_id && staffColumns.has('auth_id')) updateData.auth_id = final_auth_id;
      if (staffColumns.has('password')) updateData.password = password || 'password123';
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await dbClient
          .from('staff')
          .update(updateData)
          .eq('id', existingStaff.id);
          
        if (updateError) {
          logError('Supabase Registration Update', updateError);
          throw updateError;
        }
      }
      
      return res.json({ ...existingStaff, ...updateData });
    }

    console.log(`Inserting new staff member: ${email} with referral code ${referral_code}`);
    const insertData: any = {
      name,
      email,
      role: 'affiliate',
    };
    if (staffColumns.has('referral_code')) insertData.referral_code = referral_code;
    else if (staffColumns.has('promo_code')) insertData.promo_code = referral_code;
    
    if (staffColumns.has('branch')) insertData.branch = branch;
    if (staffColumns.has('phone')) insertData.phone = phone || null;
    if (staffColumns.has('date_joined')) insertData.date_joined = new Date().toISOString();
    if (staffColumns.has('is_approved')) insertData.is_approved = 0;
    if (staffColumns.has('password')) insertData.password = password || 'password123';
    if (final_auth_id && staffColumns.has('auth_id')) insertData.auth_id = final_auth_id;

    const { data: newStaff, error: insertError } = await dbClient
      .from('staff')
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code !== '23505') {
        logError('Supabase Registration Insert', insertError);
      }
      throw insertError;
    }

    console.log(`Registration successful for: ${email}, ID: ${newStaff.id}`);
    
    // Send notification to admins (don't await to avoid blocking response)
    sendAdminNotification(newStaff).catch(err => console.error('Background notification error:', err));
    
    res.json(newStaff);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation in Postgres
      res.status(400).json({ error: `Email or Promo Code already exists. Please try again.` });
    } else if (error.code === 'PGRST116' || error.message?.includes('relation "staff" does not exist')) {
      logError(`Registration error for ${email}`, error);
      res.status(500).json({ error: "Database table 'staff' missing. Please run the SQL schema in Supabase." });
    } else {
      logError(`Registration error for ${email}`, error);
      res.status(500).json({ error: `Server error: ${error.message || 'Unknown error'}` });
    }
  }
});

app.get("/api/settings", async (req, res) => {
  const selectColumns = Array.from(settingsColumns).length > 0 ? Array.from(settingsColumns).join(',') : '*';
  const { data: settings, error } = await supabase.from('settings').select(selectColumns).neq('key', 'promotions');
  if (error) {
    if (error.code === 'PGRST205') return res.json({});
    return res.status(500).json({ error: error.message });
  }
  
  const result: any = {};
  settings.forEach((s: any) => {
    try {
      result[s.key] = s.value ? JSON.parse(s.value) : null;
    } catch (e) {
      console.error(`Error parsing setting ${s.key}:`, e);
      result[s.key] = s.value;
    }
  });
  res.json(result);
});

app.get("/api/special-offers", async (req, res) => {
  console.log('GET /api/special-offers');
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'promotions');
      
    if (error) {
      if (error.code !== 'PGRST205') {
        logError('GET /api/special-offers', error);
      }
      // If settings table doesn't exist or other error, return empty array to prevent frontend crash
      return res.json([]);
    }
    
    if (!settings || settings.length === 0) {
      console.log('No promotions found in settings');
      return res.json([]);
    }
    
    // If multiple rows exist, take the last one (most recent)
    const setting = settings[settings.length - 1];
    let promos = [];
    try {
      promos = setting.value ? JSON.parse(setting.value) : [];
    } catch (e) {
      console.error('Error parsing promotions:', e);
      promos = setting.value || [];
    }
    console.log(`Returning ${promos.length || 0} promotions from database`);
    res.json(promos);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/special-offers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/special-offers", async (req, res) => {
  try {
    const promotions = req.body || [];
    console.log(`POST /api/special-offers - Saving ${promotions.length || 0} promotions`);
    
    // Delete existing ones first to ensure we only have one row for this key
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .eq('key', 'promotions');

    if (deleteError) {
      if (deleteError.code !== 'PGRST205') {
        console.warn('Warning: Error deleting old promotions (may not exist):', deleteError);
      }
    }

    // Insert new one
    const { error: insertError } = await supabase
      .from('settings')
      .insert({ key: 'promotions', value: JSON.stringify(promotions) });

    if (insertError) {
      if (insertError.code !== 'PGRST205') {
        logError('POST /api/special-offers', insertError);
      }
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
    
  if (error) {
    if (error.code === 'PGRST205') {
      return res.status(500).json({ error: "Settings table does not exist in the database." });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

// Tasks API
app.get("/api/tasks", async (req, res) => {
  const userId = req.headers['x-user-id'] || req.headers['authorization'] || req.headers['x-supabase-auth'];
  if (!userId) {
    return res.status(401).json([]);
  }

  const selectColumns = Array.from(taskColumns).length > 0 ? Array.from(taskColumns).join(',') : '*';
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(selectColumns)
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  if (!tasks || tasks.length === 0) return res.json([]);
  
  if (tasks && tasks.length > 0) {
    Object.keys(tasks[0]).forEach(key => taskColumns.add(key));
  }

  const staffIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  const { data: staffData } = await supabase.from('staff').select('id, name').in('id', staffIds);
  const staffMap = Object.fromEntries((staffData || []).map(s => [s.id, s]));

  const formattedTasks = tasks.map(t => ({
    ...t,
    staff: staffMap[t.assigned_to] || null,
    assigned_to_name: staffMap[t.assigned_to]?.name
  }));
  
  res.json(formattedTasks);
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, due_date, assigned_to } = req.body;
  const insertData: any = {
    title,
    created_at: new Date().toISOString()
  };

  if (taskColumns.has('description')) insertData.description = description;
  if (taskColumns.has('due_date')) insertData.due_date = due_date;
  if (taskColumns.has('assigned_to')) insertData.assigned_to = assigned_to || null;

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { status, title, description, due_date, assigned_to } = req.body;
  
  const updateData: any = {};
  if (status && taskColumns.has('status')) updateData.status = status;
  if (title && taskColumns.has('title')) updateData.title = title;
  if (description && taskColumns.has('description')) updateData.description = description;
  if (due_date && taskColumns.has('due_date')) updateData.due_date = due_date;
  if (assigned_to !== undefined && taskColumns.has('assigned_to')) updateData.assigned_to = assigned_to;

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
  try {
    if (!checkSupabase(res)) return;
    const { email, auth_id } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const selectColumns = Array.from(staffColumns).length > 0 
      ? Array.from(staffColumns).join(',') 
      : 'id, name, email, role';

    // Use service role key if available to bypass RLS (in case of broken policies like infinite recursion)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let dbClient = supabase;
    if (serviceRoleKey) {
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      if (url) {
        dbClient = createClient(
          url,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
      }
    }

    let query = dbClient.from('staff').select(selectColumns);
    
    if (auth_id && staffColumns.has('auth_id')) {
      query = query.or(`auth_id.eq.${auth_id},email.eq.${email}`);
    } else {
      query = query.eq('email', email);
    }

    const { data: staff, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching staff by email:', error);
      return res.status(500).json({ error: `Database error: ${error.message}` });
    }

    if (staff && staff.employment_status === 'deleted') {
      return res.status(403).json({ error: "This account has been deleted. Please contact an administrator." });
    }
      
    if (staff && auth_id && !staff.auth_id && staffColumns.has('auth_id')) {
      // Update the staff record with the new auth_id
      const { data: updatedStaff } = await dbClient
        .from('staff')
        .update({ auth_id })
        .eq('id', staff.id)
        .select()
        .single();
        
      if (updatedStaff) {
        return res.json(updatedStaff);
      }
    }
      
    res.json(staff || null);
  } catch (err: any) {
    console.error('CRITICAL: Error in /api/staff/email:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Notifications API
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not initialized' });
    }
    const { userId } = req.params;
    
    const selectColumns = Array.from(notificationColumns).length > 0 
      ? Array.from(notificationColumns).join(',') 
      : '*';

    // Fetch notifications for specific user OR global ones (user_id is null)
    const { data, error } = await supabase
      .from('notifications')
      .select(selectColumns)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/check-env", (req, res) => {
  res.json({ 
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
    npm_lifecycle_event: process.env.npm_lifecycle_event
  });
});

// Warm Leads API
app.get("/api/warm-leads", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { data, error } = await supabase
      .from('warm_leads')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/warm-leads", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { patient_name, patient_phone, service_id } = req.body;
    
    const { data, error } = await supabase
      .from('warm_leads')
      .insert([{
        patient_name,
        patient_phone,
        service_id,
        status: 'new',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/warm-leads/:id", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('warm_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/check-tables", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
  const { data: staff, error: e1 } = await supabase.from('staff').select('*').limit(1);
  const { data: notifications, error: e2 } = await supabase.from('notifications').select('*').limit(1);
  res.json({ staff: !!staff, notifications: !!notifications, e1, e2 });
});

app.post("/api/notifications", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not initialized' });
    }
    const { user_id, user_ids, title, message, type } = req.body;
    
    // Support both single user_id (legacy) and user_ids array (bulk)
    const targetIds = user_ids || (user_id ? [user_id] : []);

    if (targetIds.length === 0) {
      // Global notification
      const { data, error } = await supabase
        .from('notifications')
        .insert({ 
          user_id: null, 
          title, 
          message, 
          type: type || 'announcement',
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('[Notification Error] Global Insert:', error.message, error);
        return res.status(500).json({ error: error.message || 'Unknown database error', details: error });
      }
      return res.json(data);
    } else {
      // Bulk or single targeted notification
      const inserts = targetIds
        .filter((id: any) => id !== 'all') // Extra safety
        .map((id: any) => {
          const userId = id || null;
          return {
            user_id: userId,
            title,
            message,
            type: type || 'announcement',
            is_read: false
          };
        });

      console.log('[Notification Debug] Inserts Count:', inserts.length);

      if (inserts.length === 0) {
        return res.status(400).json({ error: 'No valid recipients selected' });
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(inserts);

      if (error) {
        console.error('[Notification Error] Bulk Insert:', error.message, error);
        return res.status(500).json({ error: error.message || 'Unknown database error', details: error });
      }
      return res.json({ success: true, count: inserts.length });
    }
  } catch (err: any) {
    console.error('[Notification Error] Unexpected:', err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred' });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications/:id", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/affiliate-lookup/:code", async (req, res) => {
  const { code } = req.params;
  
  if (!staffColumns.has('referral_code')) {
    return res.status(404).json({ error: "Referral code column not found" });
  }

  const { data, error } = await supabase
    .from('staff')
    .select('id, name')
    .eq('referral_code', code)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Referral code not found" });
  }

  return res.json(data);
});

app.get("/api/staff", async (req, res) => {
  const { promoCode, id } = req.query;
  
  const selectColumns = Array.from(staffColumns).length > 0 
    ? Array.from(staffColumns).join(',') 
    : 'id, name, email, role';

  let query = supabase.from('staff').select(selectColumns);
  
  if (id) {
    const { data, error } = await query.eq('id', id).single();
    return res.json(data || null);
  }
  
  if (promoCode) {
    if (staffColumns.has('referral_code')) {
      const { data, error } = await query.eq('referral_code', promoCode).single();
      return res.json(data || null);
    }
    return res.json(null);
  }
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  if (data && data.length > 0) {
    Object.keys(data[0]).forEach(key => staffColumns.add(key));
  }

  res.json(data);
});

app.post("/api/staff", async (req, res) => {
  const { name, email, role, promo_code, staff_id_code, branch, department, position, date_joined, phone, password } = req.body;
  
  // Generate a referral code based on first name and a random 3-digit number
  const generateReferralCode = (fullName: string) => {
    const firstName = fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900); // 100 to 999
    return `${firstName}${randomNum}`;
  };

  let final_referral_code = promo_code;
  if (!final_referral_code) {
    final_referral_code = generateReferralCode(name);
  }

  try {
    let auth_id = null;
    const initialPassword = password || 'password123';

    // 1. Create the user in Supabase Auth FIRST (if service role key is available)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminSupabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Check if user already exists in auth
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      let authUser = usersData?.users?.find((u: any) => u.email === email);

      if (!authUser) {
        // Create new auth user
        const { data: newAuthUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
          email: email,
          password: initialPassword,
          email_confirm: true, // Auto-confirm email since admin is creating it
          user_metadata: {
            full_name: name,
            branch: branch
          }
        });

        if (createAuthError) {
          console.error('Error creating auth user:', createAuthError);
          return res.status(400).json({ error: `Failed to create login account: ${createAuthError.message}` });
        }
        
        if (newAuthUser.user) {
          auth_id = newAuthUser.user.id;
        }
      } else {
        auth_id = authUser.id;
      }
    }

    // 2. Create the record in the staff table
    const insertData: any = {
      name,
      email,
      role,
      password: initialPassword
    };

    if (auth_id && staffColumns.has('auth_id')) insertData.auth_id = auth_id;
    if (staffColumns.has('referral_code')) insertData.referral_code = final_referral_code;
    else if (staffColumns.has('promo_code')) insertData.promo_code = final_referral_code;
    if (staffColumns.has('staff_id_code')) insertData.staff_id_code = staff_id_code;
    if (staffColumns.has('branch')) insertData.branch = branch;
    if (staffColumns.has('department')) insertData.department = department;
    if (staffColumns.has('position')) insertData.position = position;
    if (staffColumns.has('date_joined')) insertData.date_joined = date_joined || new Date().toISOString();
    if (staffColumns.has('phone')) insertData.phone = phone || null;
    if (staffColumns.has('is_approved')) insertData.is_approved = 1;

    let dbClient = supabase;
    if (serviceRoleKey) {
      dbClient = createClient(
        process.env.VITE_SUPABASE_URL || supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }

    const { data, error } = await dbClient
      .from('staff')
      .insert(insertData)
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
    if (allowedFields.includes(key) && staffColumns.has(key)) {
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

app.post("/api/admin/reset-password", async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // 1. Get the user's email from the staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('email')
      .eq('id', userId)
      .single();

    if (staffError || !staffData) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // 2. Generate a temporary password
    const tempPassword = `Welcome${Math.floor(1000 + Math.random() * 9000)}!`;

    // 3. Update the user's password in Supabase Auth using the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing service role key' });
    }

    const adminSupabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // We need to find the user in auth.users by email to get their auth ID
    const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return res.status(500).json({ error: 'Failed to access auth system' });
    }

    const authUser = usersData.users.find((u: any) => u.email === staffData.email);

    if (!authUser) {
      return res.status(404).json({ error: 'Auth user not found for this email' });
    }

    // Update the password
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      authUser.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({ success: true, tempPassword });
  } catch (error: any) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post("/api/staff/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;
  
  const updateData: any = {};
  if (staffColumns.has('is_approved')) updateData.is_approved = is_approved ? 1 : 0;
  if (is_approved && staffColumns.has('employment_status')) {
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
  
  try {
    // 1. Get the staff member's email before deleting
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('email')
      .eq('id', id)
      .single();

    if (staffError || !staffData) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // 2. Delete from the staff table FIRST to remove any foreign key constraints
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;

    // 3. Delete from Supabase Auth if service role key is available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminSupabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Find the user in auth.users by email
      const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers();
      
      if (!usersError && usersData?.users) {
        const authUser = usersData.users.find((u: any) => u.email === staffData.email);
        
        if (authUser) {
          // Delete the user from auth.users
          const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(authUser.id);
          if (deleteAuthError) {
            console.error('Error deleting user from auth:', deleteAuthError);
            // We already deleted the staff record, so we just log this error
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get("/api/services", async (req, res) => {
  const baseColumns = Array.from(serviceColumns).length > 0 
    ? Array.from(serviceColumns) 
    : ['id', 'name', 'base_price'];
  
  // Ensure we only select columns that exist in serviceColumns
  const selectColumns = Array.from(serviceColumns).join(',');

  let query = supabase.from('services').select(selectColumns);
  if (serviceColumns.has('type')) {
    query = query.or('type.neq.Deleted,type.is.null');
  }
  const { data: services, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(services.map((s: any) => {
    let allowances = {};
    let branches = [];
    try { allowances = s.allowances_json ? JSON.parse(s.allowances_json) : {}; } catch (e) {}
    try { branches = s.branches ? JSON.parse(s.branches) : []; } catch (e) {}
    return {
      ...s,
      allowances,
      branches
    };
  }));
});

app.post("/api/services", async (req, res) => {
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, image_url, promo_price, type, branches, start_date, end_date, start_time, end_time, is_featured, category, target_url } = req.body;
  
  const insertData: any = {
    name
  };

  if (serviceColumns.has('base_price')) insertData.base_price = base_price || 0;
  if (serviceColumns.has('commission_rate')) insertData.commission_rate = commission_rate || 0;
  
  if (allowances !== undefined) {
    if (serviceColumns.has('allowances_json')) {
      insertData.allowances_json = JSON.stringify(allowances || {});
    } else if (serviceColumns.has('allowances')) {
      insertData.allowances = JSON.stringify(allowances || {});
    }
  }

  if (category !== undefined && serviceColumns.has('category')) insertData.category = category;
  if (description !== undefined && serviceColumns.has('description')) insertData.description = description;
  if (image_url !== undefined && serviceColumns.has('image_url')) insertData.image_url = image_url;
  if (serviceColumns.has('promo_price')) insertData.promo_price = promo_price === undefined ? null : promo_price;
  if (type !== undefined && serviceColumns.has('type')) insertData.type = type;
  if (serviceColumns.has('branches')) insertData.branches = JSON.stringify(branches || []);
  if (serviceColumns.has('start_date')) insertData.start_date = start_date || null;
  if (serviceColumns.has('end_date')) insertData.end_date = end_date || null;
  if (serviceColumns.has('start_time')) insertData.start_time = start_time || null;
  if (serviceColumns.has('end_time')) insertData.end_time = end_time || null;
  if (is_featured !== undefined && serviceColumns.has('is_featured')) insertData.is_featured = is_featured;
  if (target_url !== undefined && serviceColumns.has('target_url')) insertData.target_url = target_url;
  if (serviceColumns.has('aracoins_perk')) {
    insertData.aracoins_perk = aracoins_perk || 0;
  }

  const { data, error } = await supabase
    .from('services')
    .insert(insertData)
    .select()
    .single();
    
  if (error) {
    console.error('Supabase insert error:', error);
    if (error.message?.includes('row-level security')) {
      return res.status(403).json({ 
        error: "Database Permission Error (RLS)", 
        message: "The database is blocking this operation. Please run the SQL commands in SUPABASE_FIX.sql in your Supabase SQL Editor.",
        details: error.message 
      });
    }
    return res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
  }
  
  if (data) {
    Object.keys(data).forEach(key => serviceColumns.add(key));
  }
  
  res.json({ id: data.id });
});

app.patch("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, image_url, promo_price, type, branches, start_date, end_date, start_time, end_time, is_featured, category, target_url } = req.body;
  
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (base_price !== undefined && serviceColumns.has('base_price')) updateData.base_price = base_price;
  if (commission_rate !== undefined && serviceColumns.has('commission_rate')) updateData.commission_rate = commission_rate;
  
  if (allowances !== undefined) {
    if (serviceColumns.has('allowances_json')) {
      updateData.allowances_json = JSON.stringify(allowances);
    } else if (serviceColumns.has('allowances')) {
      updateData.allowances = JSON.stringify(allowances);
    }
  }
  if (category !== undefined && serviceColumns.has('category')) updateData.category = category;
  if (description !== undefined && serviceColumns.has('description')) updateData.description = description;
  if (image_url !== undefined && serviceColumns.has('image_url')) updateData.image_url = image_url;
  if (promo_price !== undefined && serviceColumns.has('promo_price')) updateData.promo_price = promo_price;
  if (type !== undefined && serviceColumns.has('type')) updateData.type = type;
  if (branches !== undefined && serviceColumns.has('branches')) updateData.branches = JSON.stringify(branches);
  if (start_date !== undefined && serviceColumns.has('start_date')) updateData.start_date = start_date;
  if (end_date !== undefined && serviceColumns.has('end_date')) updateData.end_date = end_date;
  if (start_time !== undefined && serviceColumns.has('start_time')) updateData.start_time = start_time;
  if (end_time !== undefined && serviceColumns.has('end_time')) updateData.end_time = end_time;
  if (is_featured !== undefined && serviceColumns.has('is_featured')) updateData.is_featured = is_featured;
  if (aracoins_perk !== undefined && serviceColumns.has('aracoins_perk')) updateData.aracoins_perk = aracoins_perk;
  if (target_url !== undefined && serviceColumns.has('target_url')) updateData.target_url = target_url;

  console.log(`PATCH /api/services/${id} - Update Data:`, JSON.stringify(updateData, null, 2));

  const { error } = await supabase
    .from('services')
    .update(updateData)
    .eq('id', id);
    
  if (error) {
    console.error('Supabase update error:', error);
    if (error.message?.includes('row-level security')) {
      return res.status(403).json({ 
        error: "Database Permission Error (RLS)", 
        message: "The database is blocking this operation. Please run the SQL commands in SUPABASE_FIX.sql in your Supabase SQL Editor.",
        details: error.message 
      });
    }
    return res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
  }
  res.json({ success: true });
});

app.delete("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) {
    // If delete fails (likely due to foreign key constraints), soft delete by changing type
    if (serviceColumns.has('type')) {
      const { error: updateError } = await supabase.from('services').update({ type: 'Deleted' }).eq('id', id);
      if (updateError) return res.status(500).json({ error: updateError.message });
    } else {
      return res.status(500).json({ error: "Cannot delete service because it is referenced by existing referrals. Soft delete failed because 'type' column is missing." });
    }
  }
  res.json({ success: true });
});

app.get("/api/schema", (req, res) => {
  res.json({ serviceColumns: Array.from(serviceColumns) });
});

app.get("/api/referrals", async (req, res) => {
  const { staffId, branch, requesterRole, requesterBranch } = req.query;
  
  const filteredColumns = Array.from(referralColumns).filter(col => col !== 'staff' && col !== 'service' && col !== 'services');
  const baseColumns = filteredColumns.length > 0 
    ? filteredColumns.join(',') 
    : 'id, patient_name, status, created_by';
  
  // Fetch referrals first without joins to avoid relationship errors
  let query = supabase
    .from('referrals')
    .select(baseColumns)
    .order('created_at', { ascending: false });

  if (staffId && staffId !== 'undefined' && staffId !== 'null') {
    if (referralColumns.has('staff_id')) {
      query = query.eq('staff_id', staffId);
    } else {
      query = query.eq('created_by', staffId);
    }
  }
  
  const { upcoming } = req.query;
  if (upcoming === 'true') {
    const today = new Date().toISOString().split('T')[0];
    if (referralColumns.has('appointment_date')) {
      query = query.gte('appointment_date', today);
    } else {
      query = query.gte('created_at', today);
    }
  }
  
  if (branch && branch !== 'all' && branch !== 'undefined' && branch !== 'null') {
    query = query.eq('branch', branch);
  } else if (requesterRole === 'receptionist' && requesterBranch && requesterBranch !== 'undefined' && requesterBranch !== 'null') {
    query = query.eq('branch', requesterBranch);
  }

  const { data: referrals, error } = await query;
  if (error) {
    logError('GET /api/referrals', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (!referrals || referrals.length === 0) {
    return res.json([]);
  }

  // Fetch related staff and services separately
  const staffIds = [...new Set(referrals.map(r => r.staff_id || r.created_by).filter(Boolean))];
  const serviceIds = [...new Set(referrals.map(r => r.service_id).filter(Boolean))];

  const [staffRes, servicesRes] = await Promise.all([
    staffIds.length > 0 ? supabase.from('staff').select('id, name, referral_code, promo_code').in('id', staffIds) : Promise.resolve({ data: [] }),
    serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] })
  ]);

  const staffMap = Object.fromEntries((staffRes.data || []).map(s => [s.id, s]));
  const servicesMap = Object.fromEntries((servicesRes.data || []).map(s => [s.id, s]));

  const formattedReferrals = referrals.map(r => {
    const staff = staffMap[r.staff_id || r.created_by];
    const service = servicesMap[r.service_id];
    return {
      ...r,
      staff_id: r.staff_id || r.created_by,
      staff_name: staff?.name,
      promo_code: staff?.referral_code || staff?.promo_code,
      service_name: service?.name
    };
  });
  
  res.json(formattedReferrals);
});

app.post("/api/referrals", async (req, res) => {
  const { staff_id, service_id, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, date, created_by, branch, referral_code, status, commission_amount, service_name } = req.body;
  
  let staff = null;
  const fraudFlags = [];

  if (staff_id) {
    const staffSelect = Array.from(staffColumns).length > 0 
      ? Array.from(staffColumns).join(',') 
      : 'id, staff_id_code, phone, branch, pending_earnings';

    const { data, error: staffError } = await supabase
      .from('staff')
      .select(staffSelect)
      .eq('id', staff_id)
      .single();
      
    if (staffError || !data) return res.status(400).json({ error: "Referrer not found" });
    staff = data;

    // Anti-fraud rules
    if (staff.staff_id_code === patient_ic) fraudFlags.push("Self-referral (IC match)");
    if (staff.phone === patient_phone) fraudFlags.push("Self-referral (Phone match)");
    
    const surname = patient_name.split(' ').pop();
    const { count: similarCount } = await supabase
      .from('referrals')
      .select(Array.from(referralColumns).length > 0 ? Array.from(referralColumns).join(',') : '*', { count: 'exact', head: true })
      .ilike('patient_name', `%${surname}`)
      .eq('created_by', staff_id);
      
    if (similarCount && similarCount >= 3) fraudFlags.push("Repeated surname pattern");

    const { count: dailyCount } = await supabase
      .from('referrals')
      .select(Array.from(referralColumns).length > 0 ? Array.from(referralColumns).join(',') : '*', { count: 'exact', head: true })
      .eq('created_by', staff_id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      
    if (dailyCount && dailyCount >= 5) fraudFlags.push("High daily volume (>5)");
  }

  const serviceSelect = Array.from(serviceColumns).length > 0 
    ? Array.from(serviceColumns).join(',') 
    : 'commission_rate, aracoins_perk';

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select(serviceSelect)
    .eq('id', service_id)
    .single();
    
  if (serviceError || !service) return res.status(400).json({ error: "Service not found", details: serviceError });

  const insertData: any = {
    service_id,
    patient_name,
    status: status || 'pending'
  };

  if (referralColumns.has('commission_amount')) insertData.commission_amount = commission_amount || 0;
  if (referralColumns.has('service_name')) insertData.service_name = service_name || '';

  if (staff_id) {
    if (referralColumns.has('created_by')) insertData.created_by = staff_id;
    if (referralColumns.has('staff_id')) insertData.staff_id = staff_id;
  }

  if (referralColumns.has('patient_phone')) insertData.patient_phone = patient_phone || null;
  if (referralColumns.has('patient_ic')) insertData.patient_ic = patient_ic || null;
  if (referralColumns.has('patient_address')) insertData.patient_address = patient_address || null;
  if (referralColumns.has('patient_type')) insertData.patient_type = patient_type || 'new';
  if (referralColumns.has('appointment_date')) insertData.appointment_date = appointment_date || null;
  if (referralColumns.has('booking_time')) insertData.booking_time = booking_time || null;
  if (referralColumns.has('fraud_flags')) insertData.fraud_flags = JSON.stringify(fraudFlags);
  if (referralColumns.has('referral_code') && referral_code) insertData.referral_code = referral_code;
  
  if (created_by) {
    if (referralColumns.has('created_by')) insertData.created_by = created_by;
    if (referralColumns.has('staff_id')) insertData.staff_id = created_by;
  }
  
  if (staff && referralColumns.has('branch')) insertData.branch = staff.branch;
  else if (branch && referralColumns.has('branch')) insertData.branch = branch;

  // Only include aracoins_perk if the column exists in the database
  if (referralColumns.has('aracoins_perk')) {
    insertData.aracoins_perk = service.aracoins_perk || 0;
  }

  const { data: referral, error: insertError } = await supabase
    .from('referrals')
    .insert(insertData)
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message, details: insertError });

  // Three-Factor Match for Warm Lead conversion
  if (patient_phone && service_id) {
    try {
      // Find the most recent active lead matching phone and service
      const { data: matchingLeads } = await supabase
        .from('warm_leads')
        .select('id')
        .eq('patient_phone', patient_phone)
        .eq('service_id', service_id)
        .in('status', ['new', 'pending', 'uncontacted', 'contacted'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (matchingLeads && matchingLeads.length > 0) {
        // Update that specific lead to 'converted'
        await supabase
          .from('warm_leads')
          .update({ status: 'converted' })
          .eq('id', matchingLeads[0].id);
      }
    } catch (err) {
      console.error('Error during warm lead conversion:', err);
    }
  }

  // Update staff pending earnings
  if (staff_id && staff) {
    await supabase
      .from('staff')
      .update({ pending_earnings: (staff.pending_earnings || 0) + service.commission_rate })
      .eq('id', staff_id);
  }

  res.json({ id: referral.id, fraudFlags });
});

app.patch("/api/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const { status, payment_status, visit_date, verified_by, rejection_reason, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, branch, service_id } = req.body;
  
  const { data: referral, error: fetchError } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError) {
    console.error(`Error fetching referral ${id}:`, fetchError);
    return res.status(500).json({ error: `Database error: ${fetchError.message}` });
  }
  if (!referral) return res.status(404).json({ error: "Referral not found" });

  // Update referralColumns based on the actual record fetched
  if (referral) {
    Object.keys(referral).forEach(key => referralColumns.add(key));
  }

  const updateData: any = {};
  const missingColumns: string[] = [];

  if (status) {
    if (referralColumns.has('status')) updateData.status = status;
    else missingColumns.push('status');
  }
  if (payment_status) {
    if (referralColumns.has('payment_status')) updateData.payment_status = payment_status;
    else missingColumns.push('payment_status');
  }
  if (visit_date) {
    if (referralColumns.has('visit_date')) updateData.visit_date = visit_date;
    else missingColumns.push('visit_date');
  }
  if (verified_by) {
    if (referralColumns.has('verified_by')) updateData.verified_by = verified_by;
    else missingColumns.push('verified_by');
  }
  if (rejection_reason) {
    if (referralColumns.has('rejection_reason')) updateData.rejection_reason = rejection_reason;
    else missingColumns.push('rejection_reason');
  }
  if (patient_name) {
    if (referralColumns.has('patient_name')) updateData.patient_name = patient_name;
    else missingColumns.push('patient_name');
  }
  if (patient_phone) {
    if (referralColumns.has('patient_phone')) updateData.patient_phone = patient_phone;
    else missingColumns.push('patient_phone');
  }
  if (patient_ic) {
    if (referralColumns.has('patient_ic')) updateData.patient_ic = patient_ic;
    else missingColumns.push('patient_ic');
  }
  if (patient_address) {
    if (referralColumns.has('patient_address')) updateData.patient_address = patient_address;
    else missingColumns.push('patient_address');
  }
  if (patient_type) {
    if (referralColumns.has('patient_type')) updateData.patient_type = patient_type;
    else missingColumns.push('patient_type');
  }
  if (appointment_date) {
    if (referralColumns.has('appointment_date')) updateData.appointment_date = appointment_date;
    else missingColumns.push('appointment_date');
  }
  if (booking_time) {
    if (referralColumns.has('booking_time')) updateData.booking_time = booking_time;
    else missingColumns.push('booking_time');
  }
  if (branch) {
    if (referralColumns.has('branch')) updateData.branch = branch;
    else missingColumns.push('branch');
  }
  if (service_id) {
    if (referralColumns.has('service_id')) updateData.service_id = service_id;
    else missingColumns.push('service_id');
  }

  if (missingColumns.length > 0) {
    console.warn(`Attempted to update missing columns: ${missingColumns.join(', ')}`);
    return res.status(400).json({ 
      error: "Database schema mismatch", 
      message: `The following columns are missing from the referrals table: ${missingColumns.join(', ')}. Please run the database migration.`,
      missingColumns
    });
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid update data provided" });
  }

  const { error: updateError } = await supabase
    .from('referrals')
    .update(updateData)
    .eq('id', id);
    
  if (updateError) return res.status(500).json({ error: updateError.message });

  // Logic for status transitions
  const staffSelectColumns = Array.from(staffColumns).length > 0 ? Array.from(staffColumns).join(',') : 'id';
  const effectiveStaffId = referral.staff_id || referral.created_by;

  const { data: staff } = await supabase.from('staff').select(staffSelectColumns).eq('id', effectiveStaffId).single();
  if (!staff) return res.json({ success: true });

  const { data: service } = await supabase.from('services').select('commission_rate').eq('id', referral.service_id).single();

  if (status === 'approved' && referral.status !== 'approved') {
    const staffUpdate: any = {};
    const commission = service?.commission_rate || 0;
    if (staffColumns.has('pending_earnings')) staffUpdate.pending_earnings = (staff.pending_earnings || 0) - commission;
    if (staffColumns.has('approved_earnings')) staffUpdate.approved_earnings = (staff.approved_earnings || 0) + commission;
    if (staffColumns.has('lifetime_earnings')) staffUpdate.lifetime_earnings = (staff.lifetime_earnings || 0) + commission;
    
    // Only update aracoins if the column existed in the referral record and staff table
    if (referral.aracoins_perk !== undefined && staffColumns.has('aracoins')) {
      staffUpdate.aracoins = (staff.aracoins || 0) + (referral.aracoins_perk || 0);
    }

    if (Object.keys(staffUpdate).length > 0) {
      await supabase
        .from('staff')
        .update(staffUpdate)
        .eq('id', effectiveStaffId);
    }
  } else if (status === 'payout_processed' && referral.status !== 'payout_processed') {
    const staffUpdate: any = {};
    const commission = service?.commission_rate || 0;
    if (staffColumns.has('approved_earnings')) staffUpdate.approved_earnings = (staff.approved_earnings || 0) - commission;
    if (staffColumns.has('paid_earnings')) staffUpdate.paid_earnings = (staff.paid_earnings || 0) + commission;
    if (staffColumns.has('last_payout_date')) staffUpdate.last_payout_date = new Date().toISOString();

    if (Object.keys(staffUpdate).length > 0) {
      await supabase
        .from('staff')
        .update(staffUpdate)
        .eq('id', effectiveStaffId);
    }
  } else if (status === 'rejected' && referral.status !== 'rejected') {
    if (['entered', 'completed', 'paid_completed', 'pending'].includes(referral.status)) {
      if (staffColumns.has('pending_earnings')) {
        const commission = service?.commission_rate || 0;
        await supabase
          .from('staff')
          .update({ pending_earnings: (staff.pending_earnings || 0) - commission })
          .eq('id', effectiveStaffId);
      }
    }
  }
  
  res.json({ success: true });
});

app.delete("/api/referrals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('referrals').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: "Referral deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting referral:", error);
    res.status(500).json({ error: error.message });
  }
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
    // Attempt to add missing columns if they don't exist
    // Note: This requires the service role key and a database function 'exec_sql' or similar if available.
    // If not, we'll just log the failure.
    const migrationSql = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='visit_date') THEN
          ALTER TABLE referrals ADD COLUMN visit_date TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='verified_by') THEN
          ALTER TABLE referrals ADD COLUMN verified_by TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='rejection_reason') THEN
          ALTER TABLE referrals ADD COLUMN rejection_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='payment_status') THEN
          ALTER TABLE referrals ADD COLUMN payment_status TEXT;
        END IF;
      END $$;
    `;

    // We'll try to use a common RPC if it exists, but most likely we'll just have to rely on the user adding them.
    // However, we can try to use the REST API with the service role key to run SQL if we have it.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Attempting to run database migrations...');
      // Standard Supabase doesn't have a direct SQL RPC by default, but some templates do.
      supabase.rpc('exec_sql', { sql: migrationSql }).then(({ error }: any) => {
        if (error && !error.message?.includes('Could not find the function')) {
          console.warn('Migration RPC failed:', error.message);
        } else if (!error) {
          console.log('Migration RPC succeeded');
        }
      }).catch((err: any) => {
        if (!err.message?.includes('Could not find the function')) {
          console.warn('Migration RPC error:', err);
        }
      });
    }

    supabase.from('referrals').select('*').limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        referralColumns = new Set(Object.keys(data[0]));
        console.log('Detected referral columns:', Array.from(referralColumns));
      } else if (error) {
        console.warn('Referral column detection error:', error.message);
      }
    }).catch(err => console.warn('Referral column detection failed:', err));

    supabase.from('services').select().limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        serviceColumns = new Set(Object.keys(data[0]));
        console.log('Detected service columns:', Array.from(serviceColumns));
      }
    }).catch(err => console.warn('Service column detection failed:', err));

    supabase.from('staff').select().limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        staffColumns = new Set(Object.keys(data[0]));
        console.log('Detected staff columns:', Array.from(staffColumns));
      }
    }).catch(err => console.warn('Staff column detection failed:', err));

    supabase.from('tasks').select().limit(1).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        taskColumns = new Set(Object.keys(data[0]));
        console.log('Detected task columns:', Array.from(taskColumns));
      }
    }).catch(err => console.warn('Task column detection failed:', err));

    // Migrate legacy promotions to services
    supabase.from('settings').select('*').eq('key', 'promotions').then(async ({ data, error }) => {
      if (!error && data && data.length > 0) {
        const setting = data[data.length - 1];
        let promos: any[] = [];
        try {
          promos = setting.value ? JSON.parse(setting.value) : [];
        } catch (e) {
          promos = setting.value || [];
        }
        
        if (Array.isArray(promos) && promos.length > 0) {
          console.log(`Found ${promos.length} legacy promotions. Migrating to services table...`);
          for (const promo of promos) {
            // Check if already migrated (by name)
            const { data: existing } = await supabase.from('services').select('id').eq('name', promo.title).limit(1);
            if (!existing || existing.length === 0) {
              await supabase.from('services').insert({
                name: promo.title,
                description: promo.description,
                start_date: promo.start_date,
                end_date: promo.end_date,
                type: 'Promotion',
                base_price: 0,
                commission_rate: 0,
                is_featured: true,
                allowances_json: '{}',
                branches: '[]'
              });
              console.log(`Migrated promotion: ${promo.title}`);
            }
          }
          // Delete legacy promotions setting
          await supabase.from('settings').delete().eq('key', 'promotions');
          console.log('Legacy promotions migrated successfully.');
        }
      }
    }).catch(err => console.warn('Legacy promotions migration failed:', err));
  }

  app.post("/api/feedback", async (req, res) => {
    if (!checkSupabase(res)) return;
    const { staff_id, staff_name, staff_email, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          staff_id,
          staff_name,
          staff_email,
          message
        })
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      logError('POST /api/feedback', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    if (!checkSupabase(res)) return;
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logError('GET /api/feedback', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    // TODO: Implement password reset logic (e.g., send email)
    res.json({ success: true, message: "Password reset link sent (simulated)" });
  });

  // Force Vite middleware in development environment
  const isDev = process.env.npm_lifecycle_event === 'dev' || process.env.NODE_ENV !== "production" || (process.env.APP_URL && process.env.APP_URL.includes('-dev-'));
  
  if (isDev) {
    try {
      console.log('Initializing Vite middleware (Dev Mode)...');
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized.');
    } catch (err) {
      console.error('Failed to initialize Vite middleware:', err);
      // Fallback to static if vite fails
      app.use(express.static(path.join(__dirname, "dist")));
    }
  } else {
    console.log('Running in Production Mode, serving from dist...');
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
