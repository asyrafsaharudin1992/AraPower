import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('referrals').insert([{}]).select();
  console.log('Insert error:', error ? error.message : 'success');
  if (data) {
    console.log('Columns:', Object.keys(data[0]));
    await supabase.from('referrals').delete().eq('id', data[0].id);
  }
}
check();
