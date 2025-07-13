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
  
  // Don't throw error immediately, allow app to load with fallback
  console.warn('Supabase will not be available - using fallback mode');
}

// Validate that we're not using placeholder values
if (supabaseUrl && (supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project'))) {
  console.error('Supabase URL contains placeholder values:', supabaseUrl);
  console.warn('Supabase will not be available - using fallback mode');
}

// Get the current origin dynamically instead of hardcoding domain
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for server-side rendering
  return 'http://localhost:5173';
};

// Create a fallback client if environment variables are missing
let supabase: any;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        redirectTo: getCurrentOrigin(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        refreshTokenRetryCount: 1,
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              return localStorage.getItem(key);
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, value);
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key);
            }
          },
        },
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-my-custom-header': 'scrubbed-app',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 0.5,
        },
        heartbeatIntervalMs: 120000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 5000, 60000),
        timeout: 30000,
      },
    });
  } else {
    // Create a mock client for development
    console.warn('Creating mock Supabase client - database features will not work');
    supabase = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        resend: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      }),
      functions: {
        invoke: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      },
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
      }),
      removeChannel: () => {},
    };
  }
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // Create minimal fallback
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase initialization failed') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase initialization failed') }) }) }),
    }),
  };
}

export { supabase };

// ENHANCED: Improved cache with better persistence and size limits
const MAX_CACHE_SIZE = 100; // Increased for better persistence
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cleanup old cache entries
const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  
  // Remove expired entries
  for (const [key, value] of entries) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
  
  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .filter(([key]) => cache.has(key))
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = sortedEntries.slice(0, cache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
};

export const getCachedData = <T>(key: string, ttl: number = 600000): T | null => { // Default 10 minutes
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  
  // Clean up expired entry
  if (cached) {
    cache.delete(key);
  }
  
  return null;
};

export const setCachedData = <T>(key: string, data: T, ttl: number = 600000): void => { // Default 10 minutes
  // Clean up cache before adding new entry
  if (cache.size >= MAX_CACHE_SIZE) {
    cleanupCache();
  }
  
  cache.set(key, { data, timestamp: Date.now(), ttl });
};

export const clearCache = (pattern?: string): void => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// Batch database operations
export const batchOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 3
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
    
    // Add small delay between batches to prevent overwhelming the server
    if (i + batchSize < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

// Function to extract user type from OAuth state
const extractUserTypeFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const hash = window.location.hash;
    if (hash.includes('state=')) {
      const stateMatch = hash.match(/state=([^&]+)/);
      if (stateMatch) {
        const decodedState = decodeURIComponent(stateMatch[1]);
        const stateData = JSON.parse(atob(decodedState));
        return stateData.user_type || null;
      }
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    if (state) {
      const stateData = JSON.parse(atob(state));
      return stateData.user_type || null;
    }
  } catch (error) {
    console.warn('Failed to extract user type from URL state:', error);
  }
  
  return null;
};

// Enhanced auth state change handler
if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const userTypeFromUrl = extractUserTypeFromUrl();
      
      if (userTypeFromUrl) {
        session.user.user_metadata = {
          ...session.user.user_metadata,
          user_type: userTypeFromUrl
        };
      }
      
      // Don't clear cache on sign in to preserve data
      console.log('User signed in, preserving cached data');
    } else if (event === 'SIGNED_OUT') {
      clearCache();
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('pending_user_type');
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }
      }
    }
  });
}

// Periodic cache cleanup to prevent memory leaks
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 300000); // Clean up every 5 minutes
}