import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function insertUser() {
  const { data, error } = await supabase.from('staff').insert({
    name: 'Asyraf Saharudin',
    email: 'asyrafsaharudin@hsohealthcare.com',
    role: 'admin'
  });
  console.log('Insert result:', data);
  console.log('Insert error:', error);
}
insertUser();
