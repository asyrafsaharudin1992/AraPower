import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  try {
    const { data, error } = await supabase.from('staff').select('id, name').in('id', []);
    console.log({ data, error });
  } catch (e) {
    console.error("CAUGHT EXCEPTION:", e);
  }
}

run();
