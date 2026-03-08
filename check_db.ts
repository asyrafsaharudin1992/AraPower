
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

console.log('ENV:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('referrals').select().limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data in referrals table');
    // Try to get columns from another way? 
    // Usually select * on empty table still returns columns in some clients, 
    // but let's try to fetch one service to see its columns too.
    const { data: sData } = await supabase.from('services').select().limit(1);
    if (sData && sData.length > 0) console.log('Service Columns:', Object.keys(sData[0]));
    
    const { data: stData } = await supabase.from('staff').select().limit(1);
    if (stData && stData.length > 0) console.log('Staff Columns:', Object.keys(stData[0]));
  }
}

checkColumns();
