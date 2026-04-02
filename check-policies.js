import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: `
    SELECT polname, polcmd, polqual, polwithcheck 
    FROM pg_policy 
    WHERE polrelid = 'staff'::regclass;
  `});
  
  if (error) {
    console.error('RPC failed, trying direct query if possible...');
    // We can't do direct query without a backend endpoint or postgres client
    // Let's just use the REST API to query pg_policies
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'staff');
      
    if (polError) {
      console.error(polError);
    } else {
      console.log(JSON.stringify(policies, null, 2));
    }
  } else {
    console.log(data);
  }
}

checkPolicies();
