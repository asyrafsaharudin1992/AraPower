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
  res.json(data || []);
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

// ==========================================
// MISSING SETTINGS & APPROVAL APIs
// ==========================================

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

// Services API (Also restoring these just in case!)
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
// ==========================================
// NEW GEMINI AI ENDPOINT
// ==========================================
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is missing." });
    }

    // Using the flash model for fast, snappy responses
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    
    // The System Prompt: This tells the AI how to act!
    const prompt = `
      You are the official AI Assistant for AraClinic. 
      A staff member is asking you this question: "${question}"
      
      Rules:
      - Be extremely helpful, professional, and concise.
      - If they ask about medical advice, remind them you are an administrative AI, not a doctor.
      - Format your response nicely.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ answer: text });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

// Global Error Handler
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