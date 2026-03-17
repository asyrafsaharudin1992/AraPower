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

// Mock Supabase for local development without credentials
class MockSupabase {
  auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Mock Auth Not Implemented') }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  };

  storage = {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://picsum.photos/seed/${path}/200` } }),
      upload: async () => ({ data: { path: 'mock-path' }, error: null })
    })
  };

  from() {
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          then: (res: any) => res({ data: [], error: null })
        }),
        then: (res: any) => res({ data: [], error: null })
      })
    };
  }
}

export const isPlaceholder = !supabaseUrl || supabaseUrl === 'https://placeholder-project.supabase.co';

if (isPlaceholder) {
  console.warn('Supabase credentials missing or using placeholders. Using Mock Supabase for local development.');
}

export const supabase = isPlaceholder 
  ? new MockSupabase() as any 
  : createClient(
      supabaseUrl || 'https://placeholder-project.supabase.co', 
      supabaseAnonKey || 'placeholder-key',
      {
        global: {
          fetch: (url, options) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
          }
        }
      }
    );
