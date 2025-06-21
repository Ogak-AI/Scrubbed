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
    // Enable session persistence for better UX
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Optimize token refresh
    refreshTokenRetryCount: 2, // Reduced from 3
    // Store session in localStorage for faster access
    storage: {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      },
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
      eventsPerSecond: 3, // Reduced from 5
    },
  },
});

// Add connection error handling with retry logic
let retryCount = 0;
const maxRetries = 3;

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
    retryCount = 0; // Reset retry count on success
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    retryCount = 0; // Reset retry count
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in');
    retryCount = 0; // Reset retry count
    
    // Store session data for faster future access
    if (session && typeof window !== 'undefined') {
      try {
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      } catch (e) {
        console.warn('Failed to store session in localStorage:', e);
      }
    }
  }
});

// Add network error handling
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (!response.ok && retryCount < maxRetries) {
      retryCount++;
      console.log(`Network request failed, retrying (${retryCount}/${maxRetries})`);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      return originalFetch(...args);
    }
    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      retryCount++;
      console.log(`Network error, retrying (${retryCount}/${maxRetries}):`, error);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      return originalFetch(...args);
    }
    throw error;
  }
};