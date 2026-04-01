import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('referrals').insert([{ patient_name: 'dummy' }]).select();
  if (data) {
    console.log('Referrals columns:', Object.keys(data[0]));
    await supabase.from('referrals').delete().eq('id', data[0].id);
  } else {
    console.log('Insert error:', error);
  }
}
check();
