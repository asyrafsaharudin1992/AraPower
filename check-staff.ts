import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Staff columns:', Object.keys(data[0]));
  } else {
    console.log('No data or error:', error);
  }
}
check();
