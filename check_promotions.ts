
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPromotionsTable() {
  console.log('Checking for promotions table...');
  const { data, error } = await supabase.from('promotions').select('*').limit(1);
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation "promotions" does not exist')) {
      console.log('Table "promotions" does not exist.');
    } else {
      console.error('Error checking promotions table:', error);
    }
  } else {
    console.log('Table "promotions" exists.');
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot determine columns via select.');
    }
  }
}

checkPromotionsTable();
