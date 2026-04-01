import { createClient } from '@supabase/supabase-js';

// Use a robust way to get environment variables that works with Vite's 'define' and standard env loading
let supabaseUrl = "";
let supabaseAnonKey = "";

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
} catch (e) {}

if (!supabaseUrl) {
  try {
    supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  } catch (e) {}
}

try {
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
} catch (e) {}

if (!supabaseAnonKey) {
  try {
    supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  } catch (e) {}
}

console.log('--- Supabase Frontend Init ---');
console.log('URL Configured:', !!supabaseUrl && supabaseUrl.length > 0);
console.log('Key Configured:', !!supabaseAnonKey && supabaseAnonKey.length > 0);
if (supabaseUrl) {
  console.log('URL Value:', supabaseUrl.substring(0, 15) + '...');
} else {
  console.log('URL Value: EMPTY');
}
if (supabaseAnonKey) {
  console.log('Key Length:', supabaseAnonKey.length);
}

const isPlaceholderUrl = (url: string) => {
  if (!url || url.length === 0) return true;
  const lowerUrl = url.toLowerCase();
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) return true;
  return lowerUrl.includes('placeholder-project') || 
         lowerUrl.includes('your-project-url') || 
         lowerUrl.includes('your-project-id') ||
         lowerUrl === 'https://.supabase.co';
};

const isPlaceholderKey = (key: string) => {
  if (!key || key.length === 0) return true;
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('placeholder-key') || 
         lowerKey.includes('your-anon-key') ||
         lowerKey.length < 20; // Real keys are much longer
};

// Mock Supabase for local development without credentials
class MockSupabase {
  auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Mock Auth Not Implemented') }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
  };

  storage = {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://picsum.photos/seed/${path}/200` } }),
      upload: async () => ({ data: { path: 'mock-path' }, error: null }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: [], error: null }),
    })
  };

  rpc = async (fn: string, args?: any) => ({ data: null, error: new Error('Mock RPC Not Implemented') });

  from(table: string) {
    return {
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: null }),
          order: (column: string, options?: any) => ({
            then: (res: any) => res({ data: [], error: null })
          }),
          then: (res: any) => res({ data: [], error: null })
        }),
        order: (column: string, options?: any) => ({
          then: (res: any) => res({ data: [], error: null })
        }),
        then: (res: any) => res({ data: [], error: null })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => ({ data: { id: 1, ...data }, error: null })
        }),
        then: (res: any) => res({ data: [], error: null })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          then: (res: any) => res({ data: [], error: null })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: (res: any) => res({ data: [], error: null })
        })
      }),
      upsert: (data: any) => ({
        then: (res: any) => res({ data: [], error: null })
      })
    };
  }
}

export const isPlaceholder = isPlaceholderUrl(supabaseUrl) || isPlaceholderKey(supabaseAnonKey);

if (isPlaceholder) {
  console.warn('Supabase credentials missing or using placeholders. Using Mock Supabase for local development.');
  if (supabaseUrl) console.log('Current URL:', supabaseUrl);
} else {
  console.log('Supabase configured successfully with URL:', supabaseUrl.split('//')[1]?.split('.')[0] + '...');
}
console.log('------------------------------');

export const supabase = isPlaceholder 
  ? new MockSupabase() as any 
  : createClient(
      supabaseUrl || 'https://placeholder-project.supabase.co', 
      supabaseAnonKey || 'placeholder-key'
    );
