import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for production builds, fallback to process.env for dev
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

console.log('--- Supabase Frontend Init ---');
console.log('URL Source:', import.meta.env.VITE_SUPABASE_URL ? 'import.meta.env' : (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL ? 'process.env' : 'NONE'));
console.log('URL Configured:', !!supabaseUrl);
console.log('Key Configured:', !!supabaseAnonKey);

const isPlaceholderUrl = (url: string | undefined) => {
  if (!url) return true;
  return url.includes('placeholder') || url.includes('your-project-url') || url.includes('your-project-id');
};

const isPlaceholderKey = (key: string | undefined) => {
  if (!key) return true;
  return key.includes('placeholder') || key.includes('your-anon-key');
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
}
console.log('------------------------------');

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
