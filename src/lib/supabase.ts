import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please configure your .env file.');
  // Provide fallback values to prevent the app from crashing during development
  const fallbackUrl = 'https://placeholder.supabase.co';
  const fallbackKey = 'placeholder-key';
  
  supabase = createClient<Database>(fallbackUrl, fallbackKey);
} else {
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

  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Use the current origin for redirects, prioritizing custom domain
      redirectTo: getCurrentOrigin(),
      // Reduce token refresh frequency to improve performance
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
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
        eventsPerSecond: 10,
      },
    },
  });
}

export { supabase };