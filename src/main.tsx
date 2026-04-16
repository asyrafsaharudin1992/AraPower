import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

// Suppress Supabase refresh token errors from crashing the app or showing up in error overlays
const handleSupabaseAuthError = (message: string, preventDefault?: () => void) => {
  if (message && typeof message === 'string' &&
      (message.includes('Refresh Token Not Found') || 
       message.includes('Invalid Refresh Token') ||
       message.includes('invalid_refresh_token') ||
       message.includes('AuthSessionMissingError'))) {
    console.warn('Suppressed Supabase auth error:', message);
    if (preventDefault) preventDefault(); // Prevent the error from showing up in the console/error overlay
    
    // Clear the invalid session from local storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
    return true;
  }
  return false;
};

// Monkey-patch console.error to prevent Vite error overlay from catching Supabase's internal console.error("Invalid Refresh Token...")
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && 
      (args[0].includes('Invalid Refresh Token') || 
       args[0].includes('Refresh Token Not Found'))) {
    handleSupabaseAuthError(args[0]);
    return; // Swallow the error
  }
  // Also check if Error object
  if (args.length > 0 && args[0] instanceof Error && 
     (args[0].message.includes('Invalid Refresh Token') || 
      args[0].message.includes('Refresh Token Not Found'))) {
    handleSupabaseAuthError(args[0].message);
    return; // Swallow the error
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason) {
    handleSupabaseAuthError(event.reason.message || String(event.reason), () => event.preventDefault());
  }
});

window.addEventListener('error', (event) => {
  if (event.message || (event.error && event.error.message)) {
    handleSupabaseAuthError(event.message || event.error.message, () => event.preventDefault());
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster position="top-center" />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
