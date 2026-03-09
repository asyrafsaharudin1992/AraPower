
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPromotions() {
  console.log('Checking settings table for key "promotions"...');
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'promotions');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found', data.length, 'rows for key "promotions"');
    data.forEach((row: any, i: number) => {
      console.log(`Row ${i} (ID: ${row.id}):`, row.value.substring(0, 50) + '...');
    });
  }
}

checkPromotions();
