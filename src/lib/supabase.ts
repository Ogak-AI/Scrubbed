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
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Use the current origin for redirects in production
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
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