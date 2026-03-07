import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // Try import.meta.env first (Vite default)
  if (import.meta.env[key]) return import.meta.env[key];
  // Try process.env (defined in vite.config.ts)
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const isPlaceholder = !supabaseUrl || supabaseUrl === 'https://placeholder-project.supabase.co';

if (isPlaceholder) {
  console.warn('Supabase credentials missing or using placeholders. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
