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

// Global Error Handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

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

  async catch(onRejected: any) {
    try {
      const filtered = this.getFiltered();
      return { data: filtered, error: null, count: filtered.length };
    } catch (err) {
      if (onRejected) return onRejected(err);
      return { data: [], error: err };
    }
  }

  async finally(onFinally: any) {
    try {
      const filtered = this.getFiltered();
      return { data: filtered, error: null, count: filtered.length };
    } finally {
      if (onFinally) onFinally();
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
  'staff_id', 'referral_code', 'commission_amount', 'service_name',
  'visit_date', 'verified_by', 'rejection_reason', 'payment_status'
]);
let serviceColumns: Set<string> = new Set([
  'id', 'name', 'category', 'type', 'description', 'base_price',
  'promo_price', 'aracoins_perk', 'is_featured', 'image_url', 'poster_images',
  'branches', 'start_date', 'end_date', 'start_time', 'end_time',
  'duration_mins', 'created_at', 'target_url', 'commission_rate'
]);
let staffColumns: Set<string> = new Set(['id', 'name', 'email', 'role', 'created_at', 'is_approved', 'upline_id', 'upline_cases_count', 'override_earned', 'referral_code']);
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
        table.set.clear();
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
  const placeholders = ['placeholder', 'your-project-url', 'your-project-id', 'your-supabase-url', 'https://.supabase.co', 'todo'];
  const isPlaceholder = placeholders.some(p => url.toLowerCase().includes(p));
  const isInvalidFormat = !url.toLowerCase().startsWith('http');
  return isPlaceholder || isInvalidFormat;
};

const isPlaceholderKey = (key: string) => {
  if (!key || key.length === 0) return true;
  const placeholders = ['placeholder', 'your-anon-key', 'your-supabase-key', 'your-service-role-key', 'todo'];
  const isPlaceholder = placeholders.some(p => key.toLowerCase().includes(p));
  const isTooShort = key.length < 20;
  return isPlaceholder || isTooShort;
};

const createSupabaseClient = (url: string, key: string) => {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: (url: any, options: any) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
      }
    }
  });
};

let serviceRoleSupabase: any = null;

if (isPlaceholderUrl(supabaseUrl) || isPlaceholderKey(supabaseKey)) {
  console.warn('Supabase environment variables are missing or using placeholders!');
  supabase = new MockSupabase();
  serviceRoleSupabase = supabase;
} else {
  try {
    supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && !isPlaceholderKey(serviceRoleKey)) {
      serviceRoleSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);
      console.log('Service Role Supabase client initialized.');
    } else {
      serviceRoleSupabase = supabase;
    }
  } catch (err: any) {
    console.error('Failed to initialize Supabase client:', err.message);
    supabase = new MockSupabase();
    serviceRoleSupabase = supabase;
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


async function sendApprovalNotification(staff: any) {
  if (!resend) {
    console.log('RESEND_API_KEY not found. Skipping approval email.');
    return;
  }
  if (!staff?.email) {
    console.warn('sendApprovalNotification: no email address for staff', staff?.id);
    return;
  }

  const appUrl = process.env.APP_URL || 'https://arapower.hsohealthcare.com';
  const firstName = staff.name?.split(' ')[0] || 'there';

  try {
    await resend.emails.send({
      from: 'Klinik Ara 24 Jam <noreply@hsohealthcare.com>',
      to: staff.email,
      subject: '🎉 Your AraPower account has been approved!',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">
                
                <!-- Header -->
                <tr>
                  <td style="background:#1580c2;padding:36px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">AraPower</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">by Klinik Ara 24 Jam</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                      <div style="display:inline-block;background:#f0fdf4;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;margin-bottom:16px;">🎉</div>
                      <h2 style="margin:0;color:#1580c2;font-size:24px;font-weight:800;">You're approved, ${firstName}!</h2>
                      <p style="margin:10px 0 0;color:#64748b;font-size:15px;line-height:1.6;">
                        Your AraPower affiliate account has been reviewed and approved by our admin team. You can now start sharing and earning.
                      </p>
                    </div>

                    <!-- What's next -->
                    <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;">
                      <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1580c2;text-transform:uppercase;letter-spacing:0.1em;">What's next</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:8px 0;font-size:14px;color:#374151;">
                            <span style="color:#1580c2;font-weight:700;margin-right:10px;">①</span>
                            Complete your profile — add your IC and bank details to receive payouts
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:14px;color:#374151;">
                            <span style="color:#1580c2;font-weight:700;margin-right:10px;">②</span>
                            Share your personal link or QR code with your network
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:14px;color:#374151;">
                            <span style="color:#1580c2;font-weight:700;margin-right:10px;">③</span>
                            Earn commission every time a referral successfully completes a visit
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- CTA -->
                    <div style="text-align:center;margin-bottom:32px;">
                      <a href="${appUrl}" style="display:inline-block;background:#1580c2;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 40px;border-radius:40px;letter-spacing:0.03em;">
                        Open AraPower →
                      </a>
                    </div>

                    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                      If you have any questions, reach out to us at 
                      <a href="mailto:support@hsohealthcare.com" style="color:#1580c2;">support@hsohealthcare.com</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      © ${new Date().getFullYear()} Klinik Ara 24 Jam · 
                      <a href="${appUrl}" style="color:#1580c2;text-decoration:none;">arapower.hsohealthcare.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    });
    console.log('[sendApprovalNotification] Approval email sent to ' + staff.email);
  } catch (err) {
    console.error('[sendApprovalNotification] Failed to send email:', err);
  }
}


async function sendReferralNotification(staff: any, referral: any) {
  if (!resend || !staff?.email) return;

  const appUrl = process.env.APP_URL || 'https://arapower.hsohealthcare.com';
  const firstName = staff.name?.split(' ')[0] || 'there';
  const serviceName = referral.service_name || 'a service';
  
  // Strict P&C Enforcement for Emails
  const patientName = staff.role === 'affiliate' 
    ? 'Hidden (Privacy & Confidentiality)' 
    : (referral.patient_name || 'A patient');
    
  const appointmentDate = referral.appointment_date
    ? new Date(referral.appointment_date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  try {
    await resend.emails.send({
      from: 'Klinik Ara 24 Jam <noreply@hsohealthcare.com>',
      to: staff.email,
      subject: '🔔 New referral booked under your link!',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">

                <tr>
                  <td style="background:#1580c2;padding:28px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">AraPower</h1>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">by Klinik Ara 24 Jam</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                      Great news! Someone just booked an appointment through your referral link. Here are the details:
                    </p>

                    <div style="background:#f0f7ff;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #1580c2;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">Patient</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1e293b;">${patientName}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:13px;color:#64748b;">Service</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1e293b;">${serviceName}</td>
                        </tr>
                        ${appointmentDate ? `
                        <tr>
                          <td style="padding:6px 0;font-size:13px;color:#64748b;">Appointment</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1e293b;">${appointmentDate}</td>
                        </tr>` : ''}
                        <tr>
                          <td style="padding:6px 0;font-size:13px;color:#64748b;">Status</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#f59e0b;">Pending</td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">
                      Your commission will be credited once the patient completes their visit. Keep sharing your link to earn more!
                    </p>

                    <div style="text-align:center;margin-bottom:28px;">
                      <a href="${appUrl}" style="display:inline-block;background:#1580c2;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:40px;">
                        View in AraPower →
                      </a>
                    </div>

                    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                      You're receiving this because you're an AraPower affiliate.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f1f5f9;padding:16px 40px;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#94a3b8;">
                      © Klinik Ara 24 Jam · <a href="${appUrl}" style="color:#1580c2;text-decoration:none;">arapower.hsohealthcare.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    });
    console.log('[sendReferralNotification] Email sent to ' + staff.email);
  } catch (err) {
    console.error('[sendReferralNotification] Failed:', err);
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

// Constants
const PORT = 3000;
const isDev = process.env.npm_lifecycle_event === 'dev' || process.env.NODE_ENV !== "production" || (process.env.APP_URL && process.env.APP_URL.includes('-dev-'));

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
  
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('branch', name);
  
  if (error) return res.status(500).json({ error: error.message });
  
  const performance = {
    total: referrals.length,
    successful: referrals.filter(r => ['payment_approved', 'payment_made'].includes(r.status)).length,
    pending: referrals.filter(r => ['arrived', 'in_session', 'completed', 'payment_approved'].includes(r.status)).length,
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
  
  if (error) {
    if (error.code === 'PGRST205') return res.json([]); // Table doesn't exist yet
    return res.status(500).json({ error: error.message });
  }
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

// Communication Hub APIs
app.get("/api/communications/history", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { data, error } = await supabase
      .from('communications_log')
      .select('*')
      .order('id', { ascending: false })
      .limit(20);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "communications_log" does not exist')) {
        return res.json([]);
      }
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/communications/log", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { channel, recipient_count, subject, message, recipients } = req.body;
    
    // Map recipients to recipient_ids JSON string since DB expects recipient_ids
    const recipient_ids = Array.isArray(recipients) 
      ? JSON.stringify(recipients.map((r: any) => r.id)) 
      : '[]';

    const { data, error } = await supabase
      .from('communications_log')
      .insert([{
        channel,
        recipient_count,
        subject: subject || null,
        message,
        recipient_ids
      }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/communications/email", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not initialized' });
    const { user_ids, subject, message, sender_id } = req.body;
    
    if (!user_ids || user_ids.length === 0) {
      return res.status(400).json({ error: 'No recipients selected' });
    }

    const { data: recipients, error: fetchError } = await supabase
      .from('staff')
      .select('id, name, email')
      .in('id', user_ids);
    
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    
    const validRecipients = recipients?.filter(r => r.email) || [];
    
    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid emails found for selected recipients' });
    }

    if (!resend) {
      return res.status(500).json({ error: 'Email service (Resend) not configured' });
    }

    let sent = 0;
    let failed = 0;

    // Send emails
    for (const recipient of validRecipients) {
      try {
        const result = await resend.emails.send({
          from: 'Klinik Ara 24 Jam <noreply@hsohealthcare.com>',
          to: recipient.email,
          subject: subject,
          html: buildEmailTemplate(recipient.name, message, subject)
        });
        
        if (result.error) {
           console.error(`Failed to send email to ${recipient.email}:`, result.error);
           failed++;
        } else {
           sent++;
        }
      } catch (err) {
        console.error(`Failed to send email to ${recipient.email}:`, err);
        failed++;
      }
    }

    // Log to communications_log
    await supabase
      .from('communications_log')
      .insert([{
        channel: 'email',
        subject,
        message,
        recipient_count: sent,
        recipient_ids: JSON.stringify(validRecipients.map(r => r.id))
      }]);

    res.json({ success: true, sent, failed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function buildEmailTemplate(name: string, message: string, subject: string) {
  const appUrl = process.env.APP_URL || 'https://arapower.hsohealthcare.com';
  const firstName = name?.split(' ')[0] || 'there';
  
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">
            
            <!-- Header -->
            <tr>
              <td style="background:#1580c2;padding:40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">AraPower</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Communication Hub</p>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding:50px 40px;">
                <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Hello ${firstName},</h2>
                <div style="color:#475569;font-size:16px;line-height:1.7;white-space: pre-wrap;">${message}</div>
                
                <div style="margin-top:40px;padding-top:30px;border-top:1px solid #f1f5f9;">
                  <p style="margin:0;color:#94a3b8;font-size:14px;font-style:italic;">This is an official announcement from AraPower Admin.</p>
                </div>
              </td>
            </tr>

            <!-- CTA Footer -->
            <tr>
              <td style="padding:0 40px 40px;text-align:center;">
                <a href="${appUrl}" style="display:inline-block;background:#1580c2;color:#ffffff;padding:16px 32px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 10px 15px -3px rgba(21,128,194,0.3);">Open Dashboard</a>
              </td>
            </tr>

            <!-- Bottom Navigation -->
            <tr>
              <td style="background:#f8fafc;padding:30px 40px;text-align:center;border-top:1px solid #f1f5f9;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:20px;">
                  &copy; 2026 <strong>Klinik Ara 24 Jam</strong>. All rights reserved.<br>
                  <a href="https://arapower.hsohealthcare.com" style="color:#1580c2;text-decoration:none;">arapower.hsohealthcare.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

app.get('/api/public/slots', async (req, res) => {
  const { branch, date } = req.query;
  if (!branch || !date) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('booking_time')
      .eq('branch', branch)
      .eq('appointment_date', date)
      .neq('status', 'rejected');
      
    if (error) throw error;
    // Return only the time strings (e.g. "10:00:00" -> "10:00")
    const takenTimes = data.map((r: any) => r.booking_time ? r.booking_time.substring(0, 5) : '').filter(Boolean);
    res.json({ takenSlots: takenTimes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
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
    const dbClient = serviceRoleSupabase;
    let final_auth_id = auth_id;

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

  if (error) {
    if (error.code === 'PGRST205') return res.json([]); // Table doesn't exist yet
    return res.status(500).json({ error: error.message });
  }
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
    
    // Use select(*) to ensure we get all profile fields like bank_name, phone, etc.
    // This prevents state drops on the frontend when columns are migrating.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceRoleSupabase;
    let query = dbClient.from('staff').select('*');
    
    if (auth_id && staffColumns.has('auth_id')) {
      // Quote the parameters in the .or string to handle special characters (like emails with @)
      query = query.or(`auth_id.eq."${auth_id}",email.eq."${email}"`);
    } else {
      query = query.eq('email', email as string);
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
        .select('*')
        .single();
        
      if (updatedStaff) {
        if (updatedStaff.password) delete updatedStaff.password;
        return res.json(updatedStaff);
      }
    }
      
    if (staff && staff.password) delete staff.password;
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
    const { archived } = req.query;
    
    let query = supabase.from('warm_leads').select('*').order('created_at', { ascending: false });
    
    if (archived === 'true') {
      // Return only archived leads
      query = query.eq('status', 'archived');
    } else {
      // Return active + converted but exclude archived
      query = query.neq('status', 'archived');
    }
    
    const { data, error } = await query;
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
  let data = null;

  // 1. Try matching the exact Database ID
  const { data: idData, error: idError } = await supabase.from('staff').select('id, name').eq('id', code).maybeSingle();
  if (idData) data = idData;

  // 2. Try referral_code text
  if (!data) {
    const { data: refData } = await supabase.from('staff').select('id, name').ilike('referral_code', code).maybeSingle();
    if (refData) data = refData;
  }

  // 3. Try promo_code text
  if (!data) {
    const { data: promoData } = await supabase.from('staff').select('id, name').ilike('promo_code', code).maybeSingle();
    if (promoData) data = promoData;
  }

  if (!data) {
    return res.status(404).json({ error: "Referral code not found" });
  }
  return res.json(data);
});

app.get("/api/staff", async (req, res) => {
  try {
    const { promoCode, id } = req.query;
    
    // Always use * to prevent state drops on missing columns in the cache
    let query = supabase.from('staff').select('*');
    
    if (id) {
      const { data, error } = await query.eq('id', id).single();
      if (data && data.password) delete data.password;
      return res.json(data || null);
    }
    
    if (promoCode) {
      if (staffColumns.has('referral_code')) {
        const { data, error } = await query.eq('referral_code', promoCode).single();
        if (data && data.password) delete data.password;
        return res.json(data || null);
      }
      return res.json(null);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    if (data && data.length > 0) {
      Object.keys(data[0]).forEach(key => staffColumns.add(key));
    }

    // Never send passwords to frontend
    const sanitizedData = data?.map(d => {
      if (d.password) delete d.password;
      return d;
    });

    res.json(sanitizedData);
  } catch (err: any) {
    console.error("Unhandled error in /api/staff:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
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
    if (serviceRoleKey && !isPlaceholderUrl(process.env.VITE_SUPABASE_URL || '') && !isPlaceholderKey(serviceRoleKey)) {
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
    if (serviceRoleKey && !isPlaceholderUrl(process.env.VITE_SUPABASE_URL || supabaseUrl) && !isPlaceholderKey(serviceRoleKey)) {
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
    if (!serviceRoleKey || isPlaceholderUrl(process.env.VITE_SUPABASE_URL || '') || isPlaceholderKey(serviceRoleKey)) {
      return res.status(500).json({ error: 'Server configuration error: Missing or invalid service role key' });
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
  
  const { data: updatedStaff, error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', id)
    .select('id, name, email')
    .single();
    
  if (error) return res.status(500).json({ error: error.message });

  // Send approval email if account was just approved
  if (is_approved && updatedStaff?.email) {
    sendApprovalNotification(updatedStaff).catch(e =>
      console.error('[approve] Email send failed (non-blocking):', e)
    );
  }

  res.json({ success: true });
});

app.patch("/api/staff/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { name, nickname, phone, profile_picture, bank_name, bank_account_number, id_type, id_number } = req.body;
  
  const { data, error } = await supabase
    .from('staff')
    .update({ name, nickname, phone, profile_picture, bank_name, bank_account_number, id_type, id_number })
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
    if (serviceRoleKey && !isPlaceholderUrl(process.env.VITE_SUPABASE_URL || '') && !isPlaceholderKey(serviceRoleKey)) {
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

app.get("/api/test-db", async (req, res) => {
  try {
    const isMock = (supabase.constructor.name === 'MockSupabase');
    
    // Try to get columns for booking_analytics
    const { data: cols, error: colsError } = await supabase.from('booking_analytics').select('*').limit(0);
    const existingCols = !colsError && cols ? Object.keys(cols) : [];
    
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    res.json({
      status: 'success',
      supabase_type: isMock ? 'MOCK' : 'REAL',
      booking_analytics_columns: existingCols,
      booking_analytics_error: colsError?.message,
      env: {
        has_url: !!process.env.VITE_SUPABASE_URL,
        has_key: !!process.env.VITE_SUPABASE_ANON_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update track endpoint to try both singular and plural if one fails with 404
app.post("/api/analytics/track", async (req, res) => {
  const { event_type, referral_code, service_name, campaign_id } = req.body;
  console.log(`[analytics/track] Incoming: type=${event_type}, ref=${referral_code}, service=${service_name}`);
  
  if (!event_type || !referral_code) {
    return res.status(400).json({ error: "missing event_type or referral_code" });
  }

  const payload = { 
    event_type, 
    referral_code, 
    service_name: service_name || null,
    campaign_id: campaign_id || null,
    created_at: new Date().toISOString()
  };

  try {
    // Determine which table to use
    let tableName = 'booking_analytics';
    const checkPlural = await supabase.from('booking_analytics').select('id').limit(1);
    if (checkPlural.error && (checkPlural.error.message.includes('relation') || checkPlural.error.message.includes('not found'))) {
      tableName = 'booking_analytic';
    }

    // Try full payload first
    let result = await supabase.from(tableName).insert(payload).select();
    
    // Fallback: campaign_id column may not exist — retry without it, keep service_name
    if (result.error && (result.error.code === '42703' || result.error.message.toLowerCase().includes('column'))) {
      console.warn(`[analytics/track] Column error, retrying without campaign_id...`);
      const fallbackPayload = {
        event_type: payload.event_type,
        referral_code: payload.referral_code,
        service_name: payload.service_name,
        created_at: payload.created_at
      };
      result = await supabase.from(tableName).insert(fallbackPayload).select();
    }

    if (result.error) {
      console.error('[analytics/track] Supabase final error:', result.error);
      return res.status(500).json({ error: result.error.message });
    }

    console.log('[analytics/track] Success recorded in:', tableName, result.data);
    res.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error('[analytics/track] Exception:', err);
    res.status(500).json({ error: err.message });
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
    let poster_images: string[] = [];
    try { allowances = s.allowances_json ? JSON.parse(s.allowances_json) : {}; } catch (e) {}
    try { branches = s.branches ? JSON.parse(s.branches) : []; } catch (e) {}
    try { poster_images = s.poster_images ? JSON.parse(s.poster_images) : []; } catch (e) {}
    return {
      ...s,
      allowances,
      branches,
      poster_images
    };
  }));
});

app.post("/api/services", async (req, res) => {
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, image_url, poster_images, promo_price, type, branches, start_date, end_date, start_time, end_time, is_featured, category, target_url } = req.body;
  
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
  if (poster_images !== undefined && serviceColumns.has('poster_images')) insertData.poster_images = JSON.stringify(poster_images);
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
  const { name, base_price, commission_rate, aracoins_perk, allowances, description, image_url, poster_images, promo_price, type, branches, start_date, end_date, start_time, end_time, is_featured, category, target_url } = req.body;
  
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
  if (poster_images !== undefined && serviceColumns.has('poster_images')) updateData.poster_images = JSON.stringify(poster_images);

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
  try {
    const { staffId, branch, requesterRole, requesterBranch } = req.query;
    
    // SECURITY ENFORCEMENT: If not an admin/manager/receptionist, they MUST supply staffId and we forcefully filter by it
    const isStaffView = requesterRole !== 'admin' && requesterRole !== 'manager' && requesterRole !== 'receptionist';
    
    if (isStaffView && (!staffId || staffId === 'undefined' || staffId === 'null')) {
      return res.status(403).json({ error: "Unauthorized: Affiliates must filter by their own ID" });
    }

    // Fetch referrals first without joins to avoid relationship errors
    let query = supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    // Explicitly apply staff_id filtering
    if (staffId && staffId !== 'undefined' && staffId !== 'null') {
      query = query.eq('staff_id', staffId);
    }
    
    const { upcoming } = req.query;
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('appointment_date', today);
    }
    
    if (branch && branch !== 'all' && branch !== 'undefined' && branch !== 'null') {
      query = query.eq('branch', branch);
    } else if (requesterRole === 'receptionist' && requesterBranch && requesterBranch !== 'all' && requesterBranch !== 'undefined' && requesterBranch !== 'null') {
      query = query.eq('branch', requesterBranch);
    }

    let { data: referrals, error } = await query;

    // Fallback for missing columns
    if (error && error.message && error.message.includes('staff_id')) {
      console.warn('Falling back to created_by instead of staff_id');
      let fallbackQuery = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (staffId && staffId !== 'undefined' && staffId !== 'null') {
        // Explicitly apply to fallback
        fallbackQuery = fallbackQuery.eq('staff_id', staffId);
        // Also fallback to created_by if staff_id is the issue, though we prefer staff_id matching
        // In the original it was just fallbackQuery.eq('created_by', staffId); 
        // We ensure staff_id is enforced if they query staffId
        fallbackQuery = fallbackQuery.eq('created_by', staffId);
      }
        
      if (upcoming === 'true') {
        const today = new Date().toISOString().split('T')[0];
        fallbackQuery = fallbackQuery.gte('appointment_date', today);
      }
      if (branch && branch !== 'all' && branch !== 'undefined' && branch !== 'null') {
        fallbackQuery = fallbackQuery.eq('branch', branch);
      } else if (requesterRole === 'receptionist' && requesterBranch && requesterBranch !== 'all' && requesterBranch !== 'undefined' && requesterBranch !== 'null') {
        fallbackQuery = fallbackQuery.eq('branch', requesterBranch);
      }
      
      const fallbackResult = await fallbackQuery;
      referrals = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error && error.message && error.message.includes('appointment_date')) {
      console.warn('Falling back to created_at instead of appointment_date');
      let fallbackQuery = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (staffId && staffId !== 'undefined' && staffId !== 'null') {
        // Explicitly apply to fallback
        fallbackQuery = fallbackQuery.eq('staff_id', staffId);
        // Also fallback to created_by if staff_id is the issue
        fallbackQuery = fallbackQuery.eq('created_by', staffId);
      }
      
      if (upcoming === 'true') {
        const today = new Date().toISOString().split('T')[0];
        fallbackQuery = fallbackQuery.gte('created_at', today);
      }
      if (branch && branch !== 'all' && branch !== 'undefined' && branch !== 'null') {
        fallbackQuery = fallbackQuery.eq('branch', branch);
      } else if (requesterRole === 'receptionist' && requesterBranch && requesterBranch !== 'all' && requesterBranch !== 'undefined' && requesterBranch !== 'null') {
        fallbackQuery = fallbackQuery.eq('branch', requesterBranch);
      }
      
      const fallbackResult = await fallbackQuery;
      referrals = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      logError('GET /api/referrals', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!referrals || referrals.length === 0) {
      return res.json([]);
    }

    // Fetch related staff and services separately
    const staffIds = [...new Set(referrals.map((r: any) => r.staff_id || r.created_by).filter(Boolean))];
    const serviceIds = [...new Set(referrals.map((r: any) => r.service_id).filter(Boolean))];

    const [staffRes, servicesRes] = await Promise.all([
      staffIds.length > 0 ? supabase.from('staff').select('*').in('id', staffIds) : Promise.resolve({ data: [] }),
      serviceIds.length > 0 ? supabase.from('services').select('*').in('id', serviceIds) : Promise.resolve({ data: [] })
    ]);

    if (staffRes.error) {
      console.error('Error fetching staff for referrals:', staffRes.error);
    }
    if (servicesRes.error) {
      console.error('Error fetching services for referrals:', servicesRes.error);
    }

    const staffMap = Object.fromEntries((staffRes.data || []).map(s => [s.id, s]));
    const servicesMap = Object.fromEntries((servicesRes.data || []).map(s => [s.id, s]));

    const formattedReferrals = referrals.map((r: any) => {
      const staff = staffMap[r.staff_id || r.created_by];
      const service = servicesMap[r.service_id];
      const result = {
        ...r,
        date: r.created_at,              // map created_at → date for frontend compatibility
        staff_id: r.staff_id || r.created_by,
        staff_name: staff?.name,
        promo_code: staff?.referral_code || staff?.promo_code,
        service_name: r.service_name || service?.name  // prefer saved name, fallback to current
      };

      // Strict Patient Confidentiality (P&C) Enforcement
      // Redact patient data if the requester is an affiliate.
      if (requesterRole === 'affiliate') {
        result.patient_name = null;
        result.patient_phone = null;
        result.patient_ic = null;
        result.patient_type = null;
      }

      return result;
    });
    
    res.json(formattedReferrals);
  } catch (err: any) {
    console.error("Unhandled error in /api/referrals:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/payouts/summary", async (req, res) => {
  try {
    // 1. Fetch all referrals that are 'completed' but NOT YET 'paid'
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, staff_id, created_by, commission_amount, patient_name')
      .eq('status', 'completed'); // 'completed' means visit done, but not paid out yet

    if (error) return res.status(500).json({ error: error.message });
    if (!referrals || referrals.length === 0) return res.json([]);

    // 2. Fetch the staff details for these referrals
    const staffIds = [...new Set(referrals.map(r => r.staff_id || r.created_by).filter(Boolean))];
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name, bank_name, bank_account_number, id_type, id_number')
      .in('id', staffIds);

    const staffMap = Object.fromEntries((staffData || []).map(s => [s.id, s]));

    // 3. Aggregate the data by Affiliate
    const payoutSummary: Record<string, any> = {};

    referrals.forEach(ref => {
      const affiliateId = ref.staff_id || ref.created_by;
      if (!affiliateId) return;

      if (!payoutSummary[affiliateId]) {
        payoutSummary[affiliateId] = {
          affiliate_id: affiliateId,
          affiliate_name: staffMap[affiliateId]?.name || 'Unknown Affiliate',
          bank_details: `${staffMap[affiliateId]?.bank_name || 'No Bank'} - ${staffMap[affiliateId]?.bank_account_number || 'No Account'}`,
          total_patients: 0,
          total_commission_owed: 0,
          patient_ids: [] // Keep track of exactly which patients are included in this batch
        };
      }

      payoutSummary[affiliateId].total_patients += 1;
      payoutSummary[affiliateId].total_commission_owed += Number(ref.commission_amount || 0);
      payoutSummary[affiliateId].patient_ids.push(ref.id);
    });

    // Flag affiliates with incomplete profiles — admin warned before processing
    const result = Object.values(payoutSummary).map((p: any) => {
      const staff = staffMap[p.affiliate_id];
      const profileIncomplete = !staff?.bank_account_number || !staff?.id_number;
      return {
        ...p,
        profile_incomplete: profileIncomplete,
        missing_fields: [
          !staff?.bank_name ? 'bank_name' : null,
          !staff?.bank_account_number ? 'bank_account_number' : null,
          !staff?.id_number ? 'id_number' : null,
        ].filter(Boolean)
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Unhandled error in /api/payouts/summary:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/payouts/process", async (req, res) => {
  // DEPRECATED: PayoutManagement now uses PATCH /api/referrals/:id directly.
  // This endpoint is kept for backwards compatibility but redirects to payment_approved.
  const { affiliate_id, staff_id, patient_ids } = req.body;
  
  if (!patient_ids || patient_ids.length === 0) {
    return res.status(400).json({ error: "No patients selected for payout" });
  }

  // Layer 3: Block payout if affiliate profile is incomplete
  const resolvedAffiliateId = affiliate_id || staff_id;
  if (resolvedAffiliateId) {
    const { data: staffCheck } = await supabase
      .from('staff')
      .select('bank_account_number, id_number, name')
      .eq('id', resolvedAffiliateId)
      .single();
    if (staffCheck && (!staffCheck.bank_account_number || !staffCheck.id_number)) {
      return res.status(400).json({
        error: `Cannot process payout for ${staffCheck.name || 'this affiliate'} — bank account or IC number is missing from their profile.`
      });
    }
  }

  // Set to payment_approved (not payment_made) — admin must confirm payment separately
  const { error } = await supabase
    .from('referrals')
    .update({ status: 'payment_approved' })
    .in('id', patient_ids);

  if (error) {
    console.error("Payout Process Error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ message: "Payout approved successfully" });
});

app.post("/api/referrals", async (req, res) => {
  const { staff_id, service_id, patient_name, patient_phone, patient_ic, patient_address, patient_type, appointment_date, booking_time, created_by, branch, referral_code, status, commission_amount, service_name } = req.body;

  // BACKEND GUARD: Verify staff_id exists in the database
  if (staff_id) {
    const { data: staffExists, error: staffCheckError } = await supabase
      .from('staff')
      .select('id, name')
      .eq('id', staff_id)
      .maybeSingle();
      
    if (staffCheckError || !staffExists) {
      return res.status(400).json({ error: "Invalid Affiliate ID provided. Tracking code does not exist." });
    }
  }

  // 1. THE BOUNCER: Check if the exact slot was taken by someone else 1 microsecond ago
  if (appointment_date && booking_time && branch) {
    const timePrefix = booking_time.substring(0, 5); // handle '10:00' vs '10:00:00'
    
    const { data: existingBookings, error: checkError } = await supabase
      .from('referrals')
      .select('id, booking_time')
      .eq('branch', branch)
      .eq('appointment_date', appointment_date)
      .neq('status', 'rejected');

    if (!checkError && existingBookings) {
      const takenCount = existingBookings.filter((r: any) => 
        r.booking_time && r.booking_time.startsWith(timePrefix)
      ).length;
      
      // Note: If you eventually want 2 chairs per branch, change '1' to your maxSlots variable
      if (takenCount >= 1) { 
        return res.status(409).json({ 
          error: 'Slot conflict', 
          message: 'Maaf! Waktu yang anda pilih baru sahaja ditempah oleh orang lain. Sila pilih waktu lain.' 
        });
      }
    }
  }

  const insertData: any = {
    patient_name,
    patient_phone: patient_phone || null,
    patient_ic: patient_ic || null,
    patient_address: patient_address || null,
    patient_type: patient_type || 'new',
    appointment_date: appointment_date || null,
    booking_time: booking_time || null,
    status: (status || 'pending').toLowerCase(),
    service_id: service_id || null,
    service_name: service_name || null,
    commission_amount: commission_amount || 0,
    branch: branch || null,
    referral_code: referral_code || null
  };

  let finalStaffId = staff_id;

  // CRITICAL AUTO-FALLBACK: Look up affiliate if public booking
  if (!finalStaffId && referral_code) {
    let codeStaff = null;
    
    // 1. Try ID Match
    const { data: idStaff } = await supabase.from('staff').select('id').eq('id', referral_code).maybeSingle();
    if (idStaff) codeStaff = idStaff;
    
    // 2. Try Referral Code
    if (!codeStaff) {
      const { data: refStaff } = await supabase.from('staff').select('id').ilike('referral_code', referral_code).maybeSingle();
      if (refStaff) codeStaff = refStaff;
    }
    
    // 3. Try Promo Code
    if (!codeStaff) {
      const { data: promoStaff } = await supabase.from('staff').select('id').ilike('promo_code', referral_code).maybeSingle();
      if (promoStaff) codeStaff = promoStaff;
    }
    
    if (codeStaff) {
      finalStaffId = codeStaff.id;
    }
  }

  if (finalStaffId) {
    insertData.staff_id = finalStaffId;
    insertData.created_by = finalStaffId;

    // NAME CATCHER: Automatically fetch the affiliate's name if it is missing
    if (!insertData.staff_name) {
      const { data: staffData } = await supabase.from('staff').select('name').eq('id', finalStaffId).maybeSingle();
      if (staffData) {
        insertData.staff_name = staffData.name;
      }
    }
  } else {
    // SECURITY GUARD: Direct walk-ins MUST NOT receive commission incentives
    insertData.commission_amount = 0;
    
    if (created_by) {
      insertData.created_by = created_by;
    }
  }

  const { data: referral, error: insertError } = await supabase
    .from('referrals')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error("Database Insert Error:", insertError);
    return res.status(500).json({ error: insertError.message, details: insertError });
  }

  // ── Notify affiliate: in-app + email ────────────────────────────────
  if (finalStaffId) {
    try {
      // a) In-app notification
      await supabase.from('notifications').insert({
        user_id: finalStaffId,
        title: 'New Referral Booked!',
        message: referral.patient_name
          ? referral.patient_name + ' just booked ' + (referral.service_name || 'a service') + ' through your link.'
          : 'Someone just booked through your referral link.',
        type: 'referral',
        is_read: false
      });

      // b) Email notification — fetch staff email first
      const { data: staffForNotif } = await supabase
        .from('staff')
        .select('id, name, email')
        .eq('id', finalStaffId)
        .single();

      if (staffForNotif?.email) {
        sendReferralNotification(staffForNotif, referral).catch(e =>
          console.error('[referral POST] Email notify failed (non-blocking):', e)
        );
      }
    } catch (notifErr) {
      // Notification failure must never block the referral response
      console.error('[referral POST] Notification error (non-blocking):', notifErr);
    }
  }

  return res.json({ message: "Referral logged successfully", referral });
});

app.patch("/api/referrals/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Ensure status is formatted correctly if it's being updated
  if (updates.status) {
    updates.status = updates.status.toLowerCase();
  }

  // SECURITY GUARD: If clearing affiliate/staff_id, commission must drop to 0
  if ('staff_id' in updates && !updates.staff_id) {
    updates.commission_amount = 0;
  } else if (updates.commission_amount > 0 && !updates.staff_id) {
    // If they are trying to set commission > 0 but not providing a new staff_id,
    // verify the existing record actually has a staff_id.
    const { data: existing } = await supabase.from('referrals').select('staff_id').eq('id', id).maybeSingle();
    if (!existing || !existing.staff_id) {
      updates.commission_amount = 0;
    }
  }

  const { data, error } = await supabase
    .from('referrals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Database Update Error:", error);
    return res.status(500).json({ error: error.message });
  }

  // --- Override Logic Logic ---
  if (updates.status === 'completed' && data.staff_id) {
    try {
      // 1. Fetch settings
      const { data: setts } = await supabase.from('settings').select('key, value');
      const findSett = (key: string, def: number) => Number(setts?.find(s => s.key === key)?.value || def);
      const overridePercentage = findSett('override_percentage', 20);
      const overrideCaseLimit = findSett('override_case_limit', 20);

      // 2. Fetch affiliate & check upline
      const { data: affiliate } = await supabase
        .from('staff')
        .select('id, name, upline_id, upline_cases_count')
        .eq('id', data.staff_id)
        .single();

      if (affiliate?.upline_id && (affiliate.upline_cases_count || 0) < overrideCaseLimit) {
        const { data: upline } = await supabase
          .from('staff')
          .select('id, name, email, override_earned')
          .eq('id', affiliate.upline_id)
          .single();

        if (upline) {
          const originalCommission = Number(data.commission_amount || 0);
          const overrideAmount = originalCommission * (overridePercentage / 100);
          const downlineAmount = originalCommission - overrideAmount;

          // a) Update referral commission
          await supabase
            .from('referrals')
            .update({ commission_amount: downlineAmount })
            .eq('id', id);

          // b) Insert override earning
          await supabase
            .from('override_earnings')
            .insert({
              upline_id: upline.id,
              downline_id: affiliate.id,
              referral_id: id,
              amount: overrideAmount,
              status: 'earned'
            });

          // c) Update staff counts
          const newUplineCasesCount = (affiliate.upline_cases_count || 0) + 1;
          await supabase
            .from('staff')
            .update({ upline_cases_count: newUplineCasesCount })
            .eq('id', affiliate.id);

          await supabase
            .from('staff')
            .update({ override_earned: (upline.override_earned || 0) + overrideAmount })
            .eq('id', upline.id);

          // d) Notifications
          
          // To Upline
          const uplineMsg = `${affiliate.name} completed a referral. You earned RM${overrideAmount.toFixed(2)} override (case ${newUplineCasesCount} of ${overrideCaseLimit}).`;
          await supabase.from('notifications').insert({
            user_id: upline.id,
            title: `Override earned from ${affiliate.name}`,
            message: uplineMsg,
            type: 'payout'
          });

          if (upline.email && resend) {
            resend.emails.send({
              from: 'AraPower <noreply@hsohealthcare.com>',
              to: upline.email,
              subject: 'You earned an override commission from your network',
              html: `<p>${uplineMsg}</p>`
            }).catch(e => console.error('Upline email failed', e));
          }

          // To Downline
          const downlineMsg = `Your upline ${upline.name} earned RM${overrideAmount.toFixed(2)} from your referral. ${overrideCaseLimit - newUplineCasesCount} cases remaining in override period.`;
          await supabase.from('notifications').insert({
            user_id: affiliate.id,
            title: 'Your upline earned from your referral',
            message: downlineMsg,
            type: 'referral'
          });

          // Limit reached notification
          if (newUplineCasesCount === overrideCaseLimit) {
            const totalEarned = (upline.override_earned || 0) + overrideAmount;
            
            await supabase.from('notifications').insert([
              {
                user_id: upline.id,
                title: 'Override period ended',
                message: `Your override period with ${affiliate.name} has ended. Total earned: RM${totalEarned.toFixed(2)}.`,
                type: 'announcement'
              },
              {
                user_id: affiliate.id,
                title: 'Override period ended',
                message: `You now keep 100% of your commission. Override period with ${upline.name} has ended.`,
                type: 'announcement'
              }
            ]);
          }
        }
      }
    } catch (overErr) {
      console.error('Error processing override logic:', overErr);
    }
  }

  return res.json({ message: "Referral updated successfully", data });
});

app.delete("/api/referrals/:id", async (req, res) => {
  const { id } = req.params;
  
  const { error } = await supabase
    .from('referrals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Database Delete Error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ message: "Referral deleted successfully" });
});

// --- Network Management Routes ---

app.get("/api/network/settings", async (req, res) => {
  if (!checkSupabase(res)) return;
  
  const keys = [
    'override_percentage',
    'override_case_limit',
    'downline_cap_base',
    'downline_cap_unlocked',
    'downline_cap_unlock_threshold',
    'network_max_depth'
  ];
  
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', keys);
    
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  const settings: any = {
    override_percentage: 20,
    override_case_limit: 20,
    downline_cap_base: 5,
    downline_cap_unlocked: 50,
    downline_cap_unlock_threshold: 10,
    network_max_depth: 1
  };
  
  data?.forEach((s: any) => {
    settings[s.key] = Number(s.value);
  });
  
  res.json(settings);
});

app.post("/api/network/settings", async (req, res) => {
  if (!checkSupabase(res)) return;
  
  const settings = req.body;
  const entries = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value)
  }));
  
  const { error } = await supabase
    .from('settings')
    .upsert(entries, { onConflict: 'key' });
    
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ success: true });
});

app.get("/api/network/downlines/:affiliateId", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { affiliateId } = req.params;
  
  // 1. Fetch settings for limit check
  const { data: setts } = await supabase.from('settings').select('key, value').in('key', ['override_case_limit']);
  const overrideCaseLimit = Number(setts?.find(s => s.key === 'override_case_limit')?.value || 20);

  // 2. Fetch staff where upline_id = affiliateId
  const { data: downlines, error } = await supabase
    .from('staff')
    .select(`
      id, name, email, referral_code, created_at, upline_cases_count,
      referrals:referrals(count)
    `)
    .eq('upline_id', affiliateId)
    .eq('referrals.status', 'completed'); // This nested filter might not work directly for count in standard REST
    
  if (error) return res.status(500).json({ error: error.message });

  // 3. Since Supabase REST nested count is tricky, we'll fetch them normally or use another approach
  // Let's just fetch the downlines first
  const { data: downlineList, error: listErr } = await supabase
    .from('staff')
    .select('id, name, email, referral_code, created_at, upline_cases_count')
    .eq('upline_id', affiliateId);
    
  if (listErr) return res.status(500).json({ error: listErr.message });

  // 4. Fetch counts and override earnings
  const results = await Promise.all(downlineList.map(async (dl: any) => {
    // Count completed referrals
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', dl.id)
      .eq('status', 'completed');

    // Sum override earnings
    const { data: earnings } = await supabase
      .from('override_earnings')
      .select('amount')
      .eq('upline_id', affiliateId)
      .eq('downline_id', dl.id);

    const totalOverride = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    return {
      ...dl,
      referral_count: referralCount || 0,
      total_override_earned: totalOverride,
      is_active: (dl.upline_cases_count || 0) < overrideCaseLimit
    };
  }));

  res.json(results);
});

app.post("/api/network/recruit", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { affiliate_id } = req.body;
  
  if (!affiliate_id) return res.status(400).json({ error: 'affiliate_id is required' });

  // 1. Fetch affiliate's completed own referrals count
  const { count: ownCases } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', affiliate_id)
    .eq('status', 'completed');

  // 2. Fetch current downline count
  const { count: downlineCount } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('upline_id', affiliate_id);

  // 3. Fetch settings
  const { data: setts } = await supabase.from('settings').select('key, value');
  const findSett = (key: string, def: number) => Number(setts?.find(s => s.key === key)?.value || def);
  
  const capBase = findSett('downline_cap_base', 5);
  const capUnlocked = findSett('downline_cap_unlocked', 50);
  const threshold = findSett('downline_cap_unlock_threshold', 10);

  // 4. Calculate cap
  const cap = (ownCases || 0) >= threshold ? capUnlocked : capBase;
  const current = downlineCount || 0;

  // 5. Eligibility check
  if (current >= cap) {
    return res.status(400).json({ 
      error: 'Downline cap reached', 
      cap, 
      current,
      eligible: false
    });
  }

  res.json({ 
    eligible: true, 
    current, 
    cap, 
    slots_remaining: cap - current 
  });
});

app.patch("/api/staff/:id/set-upline", async (req, res) => {
  if (!checkSupabase(res)) return;
  const { id } = req.params;
  const { recruiter_code } = req.body;

  if (!recruiter_code) return res.status(400).json({ error: 'recruiter_code is required' });

  // 1. Find recruiter
  const { data: recruiter, error: rErr } = await supabase
    .from('staff')
    .select('id, name, role, email, referral_code, upline_id')
    .ilike('referral_code', recruiter_code)
    .maybeSingle();

  if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });
  if (recruiter.id == id) return res.status(400).json({ error: 'You cannot recruit yourself' });
  if (!['affiliate', 'ambassador', 'admin', 'manager'].includes(recruiter.role)) {
     return res.status(400).json({ error: 'Recruiter must be an affiliate or ambassador' });
  }

  // 2. Check recruiter's cap
  // (Same logic as /api/network/recruit but on server side)
  const { count: ownCases } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', recruiter.id)
    .eq('status', 'completed');

  const { count: downlineCount } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('upline_id', recruiter.id);

  const { data: setts } = await supabase.from('settings').select('key, value');
  const findSett = (key: string, def: number) => Number(setts?.find(s => s.key === key)?.value || def);
  
  const capBase = findSett('downline_cap_base', 5);
  const capUnlocked = findSett('downline_cap_unlocked', 50);
  const threshold = findSett('downline_cap_unlock_threshold', 10);
  
  const cap = (ownCases || 0) >= threshold ? capUnlocked : capBase;
  if ((downlineCount || 0) >= cap) {
    return res.status(400).json({ error: 'Recruiter downline cap reached' });
  }

  // 3. Update staff
  const { data: updated, error: uErr } = await supabase
    .from('staff')
    .update({ upline_id: recruiter.id })
    .eq('id', id)
    .select()
    .single();

  if (uErr) return res.status(500).json({ error: uErr.message });

  res.json({ success: true, upline: { id: recruiter.id, name: recruiter.name } });
});

app.get("/api/network/admin-overview", async (req, res) => {
  if (!checkSupabase(res)) return;

  // 1. Fetch settings for override_case_limit
  const { data: setts } = await supabase.from('settings').select('key, value').in('key', ['override_case_limit']);
  const limit = Number(setts?.find(s => s.key === 'override_case_limit')?.value || 20);

  // 2. Fetch staff with upline relationships
  const { data: relationships, error: rErr } = await supabase
    .from('staff')
    .select('id, name, upline_id, upline_cases_count')
    .not('upline_id', 'is', null);

  if (rErr) return res.status(500).json({ error: rErr.message });

  // 3. Fetch earnings for totals
  const { data: earnings, error: eErr } = await supabase
    .from('override_earnings')
    .select('amount, upline_id');

  if (eErr) return res.status(500).json({ error: eErr.message });

  // 4. Summarize
  const total_relationships = (relationships || []).length;
  const active = (relationships || []).filter(r => (r.upline_cases_count || 0) < limit).length;
  const expired = total_relationships - active;
  const total_override_paid = (earnings || []).reduce((sum, e) => sum + Number(e.amount), 0);

  // 5. Group by upline for top recruiters
  const recruiterStats: any = {};
  (relationships || []).forEach(r => {
    if (!recruiterStats[r.upline_id]) {
      recruiterStats[r.upline_id] = { id: r.upline_id, downlines: 0, override: 0 };
    }
    recruiterStats[r.upline_id].downlines += 1;
  });

  (earnings || []).forEach(e => {
    if (recruiterStats[e.upline_id]) {
      recruiterStats[e.upline_id].override += Number(e.amount);
    }
  });

  // Fetch names for top recruiters
  const topRecruitersIds = Object.keys(recruiterStats)
    .sort((a, b) => recruiterStats[b].downlines - recruiterStats[a].downlines)
    .slice(0, 5);

  const { data: recruiterNames } = await supabase
    .from('staff')
    .select('id, name')
    .in('id', topRecruitersIds);

  const top_recruiters = topRecruitersIds.map(id => {
    const stats = recruiterStats[id];
    const name = recruiterNames?.find(n => String(n.id) === String(id))?.name || 'Unknown';
    return {
      name,
      downlines: stats.downlines,
      override: stats.override
    };
  });

  res.json({
    total_relationships,
    active,
    expired,
    total_override_paid,
    top_recruiters
  });
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
        
        -- Create booking_analytics table if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='booking_analytics') THEN
          CREATE TABLE booking_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            referral_code TEXT NOT NULL,
            service_name TEXT,
            campaign_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        END IF;

        -- Create booking_analytic table (singular) if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='booking_analytic') THEN
          CREATE TABLE booking_analytic (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            referral_code TEXT NOT NULL,
            service_name TEXT,
            campaign_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        END IF;

        -- Ensure columns exist in both (idempotent)
        BEGIN
          ALTER TABLE booking_analytics ADD COLUMN IF NOT EXISTS service_name TEXT;
          ALTER TABLE booking_analytics ADD COLUMN IF NOT EXISTS campaign_id TEXT;
          ALTER TABLE booking_analytic ADD COLUMN IF NOT EXISTS service_name TEXT;
          ALTER TABLE booking_analytic ADD COLUMN IF NOT EXISTS campaign_id TEXT;
        EXCEPTION WHEN OTHERS THEN 
          NULL;
        END;

        -- Enable RLS and add open policies for both
        ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;
        ALTER TABLE booking_analytic ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable all for app" ON booking_analytics;
        CREATE POLICY "Enable all for app" ON booking_analytics FOR ALL USING (true) WITH CHECK (true);
        
        DROP POLICY IF EXISTS "Enable all for app" ON booking_analytic;
        CREATE POLICY "Enable all for app" ON booking_analytic FOR ALL USING (true) WITH CHECK (true);


        -- Create communications_log table if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='communications_log') THEN
          CREATE TABLE communications_log (
            id BIGSERIAL PRIMARY KEY,
            channel TEXT NOT NULL,
            recipient_count INTEGER DEFAULT 0,
            subject TEXT,
            message TEXT NOT NULL,
            sent_at TIMESTAMPTZ DEFAULT NOW(),
            recipient_ids TEXT DEFAULT '[]'
          );
          ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
          -- Check if policy exists before creating
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communications_log' AND policyname = 'Enable all for app') THEN
            CREATE POLICY "Enable all for app" ON communications_log FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END IF;

        -- Add network-related columns to staff
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='upline_id') THEN
          ALTER TABLE staff ADD COLUMN upline_id BIGINT REFERENCES staff(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='upline_cases_count') THEN
          ALTER TABLE staff ADD COLUMN upline_cases_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='override_earned') THEN
          ALTER TABLE staff ADD COLUMN override_earned NUMERIC DEFAULT 0;
        END IF;

        -- Add referral_code to staff if missing (some tables had promo_code instead)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='referral_code') THEN
          ALTER TABLE staff ADD COLUMN referral_code TEXT UNIQUE;
        END IF;

        -- Add commission_amount to referrals if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='commission_amount') THEN
          ALTER TABLE referrals ADD COLUMN commission_amount NUMERIC DEFAULT 0;
        END IF;

        -- Create override_earnings table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='override_earnings') THEN
          CREATE TABLE override_earnings (
            id BIGSERIAL PRIMARY KEY,
            upline_id BIGINT REFERENCES staff(id),
            downline_id BIGINT REFERENCES staff(id),
            referral_id BIGINT REFERENCES referrals(id),
            amount NUMERIC NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          ALTER TABLE override_earnings ENABLE ROW LEVEL SECURITY;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'override_earnings' AND policyname = 'Enable all for app') THEN
            CREATE POLICY "Enable all for app" ON override_earnings FOR ALL USING (true) WITH CHECK (true);
          END IF;
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

  app.get("/api/diag", async (req, res) => {
    // Diag implementation... (keeping it simple here, will expand if needed)
    res.json({ status: 'ok', supabase: !!supabase });
  });

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
      app.use(express.static(path.join(__dirname, "dist")));
    }
  } else {
    console.log('Running in Production Mode, serving from dist...');
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startServer().catch(err => console.error('Server init failed:', err));
});

export default app;