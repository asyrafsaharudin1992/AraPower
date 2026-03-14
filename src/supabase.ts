import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for production builds, fallback to process.env for dev
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- Supabase Frontend Init ---');
console.log('URL Source:', import.meta.env.VITE_SUPABASE_URL ? 'import.meta.env' : (process.env.VITE_SUPABASE_URL ? 'process.env' : 'NONE'));
console.log('URL Configured:', !!supabaseUrl);
console.log('Key Configured:', !!supabaseAnonKey);
if (supabaseUrl && supabaseUrl.includes('placeholder')) {
  console.warn('Supabase URL is still the placeholder!');
}
console.log('------------------------------');

export const isPlaceholder = !supabaseUrl || supabaseUrl === 'https://placeholder-project.supabase.co';

if (isPlaceholder) {
  console.warn('Supabase credentials missing or using placeholders. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your platform settings and restart the dev server.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
