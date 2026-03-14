import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  console.log('Staff:', data ? 'Exists' : 'Error', error);
  
  const { data: d2, error: e2 } = await supabase.from('settings').select('*').limit(1);
  console.log('Settings:', d2 ? 'Exists' : 'Error', e2);
}

check();
