import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function addPassword() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE staff ADD COLUMN IF NOT EXISTS password TEXT DEFAULT \'password123\';'
  });
  console.log('Add password error:', error);
}
addPassword();
