import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Merge process.env (platform settings) with .env file variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

  console.log('--- Vite Config Env Loading ---');
  console.log('Mode:', mode);
  console.log('process.env.VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
  console.log('env.VITE_SUPABASE_URL:', !!env.VITE_SUPABASE_URL);
  console.log('Final supabaseUrl:', !!supabaseUrl);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey || ""),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl || ""),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
