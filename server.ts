import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function sendAdminNotification(newUser: any) {
  if (!resend) return;

  const { data: admins } = await supabase.from('staff').select('email').eq('role', 'admin');
  if (!admins || admins.length === 0) return;

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
          </div>
          <p style="margin-top: 20px;">
            Please log in to the <a href="${process.env.APP_URL || '#'}" style="color: #10b981; font-weight: bold;">Admin Panel</a> to review.
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('key').limit(1);
    res.json({ 
      status: "ok", 
      db: error ? "error" : "connected",
      time: new Date().toISOString(),
      vercel: !!process.env.VERCEL
    });
  } catch (e: any) {
    res.json({ status: "ok", db: `error: ${e.message}` });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();

  if (staff) {
    res.json(staff);
  } else {
    res.status(401).json({ error: "Invalid email or password" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, branch, phone } = req.body;
  
  const { data: settings } = await supabase.from('settings').select('value').eq('key', 'auth').single();
  const authSettings = settings ? JSON.parse(settings.value) : { allowRegistration: true };
  
  if (!authSettings.allowRegistration) {
    return res.status(403).json({ error: "Self-registration is currently disabled." });
  }

  const namePart = name.split(' ')[0].toUpperCase();
  const randomPart = Math.floor(100 + Math.random() * 899);
  const promo_code = `${namePart}-${randomPart}`;

  const { data: newStaff, error } = await supabase.from('staff').insert([{
    name, email, password: password || 'password123', role: 'staff', promo_code, branch, phone, date_joined: new Date().toISOString(), is_approved: 0
  }]).select().single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  sendAdminNotification(newStaff);
  res.json(newStaff);
});

// Tasks API
app.get("/api/tasks", async (req, res) => {
  const { data, error } = await supabase.from('tasks').select(`*, staff:assigned_to(name)`).order('due_date', { ascending: true });
  const formattedTasks = (data || []).map((t: any) => ({
    ...t,
    assigned_to_name: t.staff?.name,
    staff: undefined
  }));
  res.json(formattedTasks);
});

app.post("/api/tasks", async (req, res) => {
  const { data, error } = await supabase.from('tasks').insert([req.body]).select().single();
  res.json({ id: data?.id, success: !error });
});

// Staff API
app.get("/api/staff", async (req, res) => {
  const { promoCode, id } = req.query;
  let query = supabase.from('staff').select('*');
  
  if (id) query = query.eq('id', id).single();
  else if (promoCode) query = query.eq('promo_code', promoCode).single();

  const { data } = await query;
  res.json(data || (id || promoCode ? null : []));
});

app.post("/api/staff", async (req, res) => {
  const { data, error } = await supabase.from('staff').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.patch("/api/staff/:id", async (req, res) => {
  const { error } = await supabase.from('staff').update(req.body).eq('id', req.params.id);
  res.json({ success: !error });
});

// Referrals API
app.get("/api/referrals", async (req, res) => {
  const { staffId, branch } = req.query;
  let query = supabase.from('referrals').select(`*, staff:staff_id(name, promo_code), services:service_id(name)`).order('date', { ascending: false });

  if (staffId) query = query.eq('staff_id', staffId);
  if (branch && branch !== 'all') query = query.eq('branch', branch);

  const { data } = await query;
  const formattedReferrals = (data || []).map((r: any) => ({
    ...r,
    staff_name: r.staff?.name,
    promo_code: r.staff?.promo_code,
    service_name: r.services?.name,
    staff: undefined,
    services: undefined
  }));
  res.json(formattedReferrals);
});

app.post("/api/referrals", async (req, res) => {
  const { data: service } = await supabase.from('services').select('commission_rate').eq('id', req.body.service_id).single();
  if (!service) return res.status(400).json({ error: "Service not found" });

  const { data: result, error } = await supabase.from('referrals').insert([{
    ...req.body,
    commission_amount: service.commission_rate,
    status: 'entered'
  }]).select().single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: result.id });
});

app.patch("/api/referrals/:id", async (req, res) => {
    const { id } = req.params;
    const { status, payment_status, visit_date, verified_by, rejection_reason } = req.body;
    
    // 1. Fetch the referral and current staff data
    const { data: referral } = await supabase.from('referrals').select('*').eq('id', id).single();
    if (!referral) return res.status(404).json({ error: "Referral not found" });

    const { data: staff } = await supabase.from('staff').select('*').eq('id', referral.staff_id).single();
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    let earningsUpdate: any = {};
    const commission = referral.commission_amount || 0;

    // 2. Logic for Status Transitions
    if (status === 'approved' && referral.status !== 'approved') {
        // Move from Pending to Approved + Increase Lifetime
        earningsUpdate = {
            pending_earnings: Math.max(0, (staff.pending_earnings || 0) - commission),
            approved_earnings: (staff.approved_earnings || 0) + commission,
            lifetime_earnings: (staff.lifetime_earnings || 0) + commission
        };
    } 
    else if (status === 'payout_processed' && referral.status !== 'payout_processed') {
        // Move from Approved to Paid (Lifetime stays the same as it was already added)
        earningsUpdate = {
            approved_earnings: Math.max(0, (staff.approved_earnings || 0) - commission),
            paid_earnings: (staff.paid_earnings || 0) + commission,
            last_payout_date: new Date().toISOString()
        };
    } 
    else if (status === 'rejected' && referral.status !== 'rejected') {
        // Deduct from Pending only if it was in a pending state
        if (['entered', 'completed', 'buffer'].includes(referral.status)) {
            earningsUpdate = {
                pending_earnings: Math.max(0, (staff.pending_earnings || 0) - commission)
            };
        }
    }

    // 3. Execute Updates
    const { error: refError } = await supabase.from('referrals').update({
        status, payment_status, visit_date, verified_by, rejection_reason
    }).eq('id', id);

    if (Object.keys(earningsUpdate).length > 0) {
        await supabase.from('staff').update(earningsUpdate).eq('id', referral.staff_id);
    }

    res.json({ success: !refError });
});

// Settings & Approval APIs
app.get("/api/settings", async (req, res) => {
  const { data, error } = await supabase.from('settings').select('*');
  const result: any = {};
  if (data) {
    data.forEach((s: any) => {
      result[s.key] = JSON.parse(s.value);
    });
  }
  res.json(result);
});

app.post("/api/settings", async (req, res) => {
  const { key, value } = req.body;
  const { error } = await supabase.from('settings').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
  res.json({ success: !error });
});

app.post("/api/staff/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;
  const { error } = await supabase.from('staff').update({ is_approved: is_approved ? 1 : 0 }).eq('id', id);
  res.json({ success: !error });
});

app.post("/api/staff/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('staff').update({ password: 'password123' }).eq('id', id);
  res.json({ success: !error });
});

app.patch("/api/staff/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { nickname, profile_picture, bank_name, bank_account_number } = req.body;
  await supabase.from('staff').update({ nickname, profile_picture, bank_name, bank_account_number }).eq('id', id);
  const { data } = await supabase.from('staff').select('*').eq('id', id).single();
  res.json(data);
});

app.delete("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('staff').delete().eq('id', id);
  res.json({ success: !error });
});

// Services API
app.get("/api/services", async (req, res) => {
  const { data } = await supabase.from('services').select('*');
  res.json((data || []).map((s: any) => ({
    ...s,
    allowances: JSON.parse(s.allowances_json || '{}')
  })));
});

app.post("/api/services", async (req, res) => {
  const { name, base_price, commission_rate, aracoins_perk, allowances } = req.body;
  const { data, error } = await supabase.from('services').insert([{
    name, base_price, commission_rate, aracoins_perk: aracoins_perk || 0, allowances_json: JSON.stringify(allowances || {})
  }]).select().single();
  res.json({ id: data?.id });
});

app.patch("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { name, base_price, commission_rate, aracoins_perk, allowances } = req.body;
  const { error } = await supabase.from('services').update({
    name, base_price, commission_rate, aracoins_perk: aracoins_perk || 0, allowances_json: JSON.stringify(allowances || {})
  }).eq('id', id);
  res.json({ success: !error });
});

app.delete("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('services').delete().eq('id', id);
  res.json({ success: !error });
});

// AI Assistant
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key is missing." });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    const prompt = `You are the AI Assistant for AraClinic. Question: "${question}" - Be professional and helpful.`;
    const result = await model.generateContent(prompt);
    res.json({ answer: (await result.response).text() });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: "Internal Server Error" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }
}

startServer();

export default app;