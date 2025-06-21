import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate that we're not using placeholder values
if (supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
  console.error('Supabase URL contains placeholder values:', supabaseUrl);
  throw new Error('Supabase URL is not configured properly. Please update your .env file with real Supabase credentials.');
}

// Get the current origin, prioritizing the custom domain
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    // If we're on the custom domain, use it
    if (window.location.hostname === 'scrubbed.online') {
      return 'https://scrubbed.online';
    }
    // Otherwise use the current origin
    return window.location.origin;
  }
  // Fallback for server-side rendering
  return 'https://scrubbed.online';
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use the current origin for redirects, prioritizing custom domain
    redirectTo: getCurrentOrigin(),
    // Disable session persistence to prevent stale session issues
    autoRefreshToken: true,
    persistSession: false, // DISABLED: This prevents storing sessions in localStorage
    detectSessionInUrl: true,
    // Reduce token refresh attempts
    refreshTokenRetryCount: 1,
    // Use memory-only storage (no persistence)
    storage: {
      getItem: () => null, // Always return null - no persistence
      setItem: () => {}, // Do nothing - no persistence
      removeItem: () => {}, // Do nothing - no persistence
    },
  },
  // Add connection pooling and performance optimizations
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-my-custom-header': 'scrubbed-app',
    },
  },
  // Reduce real-time connection overhead
  realtime: {
    params: {
      eventsPerSecond: 3,
    },
  },
});

// Simplified auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any remaining localStorage data
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    }
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in successfully');
  }
});