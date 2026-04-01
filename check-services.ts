import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('services').insert([{ name: 'dummy' }]).select();
  if (data) {
    console.log('Services columns:', Object.keys(data[0]));
    await supabase.from('services').delete().eq('id', data[0].id);
  } else {
    console.log('Insert error:', error);
  }
}
check();
