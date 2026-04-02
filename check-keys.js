import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Service Role Key starts with:', supabaseKey.substring(0, 20));
console.log('Anon Key starts with:', anonKey.substring(0, 20));
console.log('Are they the same?', supabaseKey === anonKey);
