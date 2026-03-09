
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking settings table schema...');
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'settings' });
  
  if (error) {
    console.log('RPC get_table_info failed, trying direct query...');
    const { data: rows, error: queryError } = await supabase.from('settings').select('*').limit(1);
    if (queryError) {
      console.error('Query error:', queryError);
    } else {
      console.log('Sample row:', rows[0]);
    }
  } else {
    console.log('Schema:', data);
  }
}

checkSchema();
