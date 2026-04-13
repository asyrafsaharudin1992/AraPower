import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

// Suppress Supabase refresh token errors from crashing the app or showing up in error overlays
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string' && 
      (event.reason.message.includes('Refresh Token Not Found') || 
       event.reason.message.includes('Invalid Refresh Token') ||
       event.reason.message.includes('invalid_refresh_token'))) {
    console.warn('Suppressed Supabase refresh token error:', event.reason.message);
    event.preventDefault(); // Prevent the error from showing up in the console/error overlay
    
    // Clear the invalid session from local storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
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
