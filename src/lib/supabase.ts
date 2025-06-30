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
        refreshTokenRetryCount: 1, // Reduced from 2
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
          eventsPerSecond: 0.5, // Reduced from 1
        },
        heartbeatIntervalMs: 120000, // Increased from 60000
        reconnectAfterMs: (tries: number) => Math.min(tries * 5000, 60000), // Increased delays
        timeout: 30000, // Increased from 20000
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

// CRITICAL FIX: Improved cache with size limits and automatic cleanup
const MAX_CACHE_SIZE = 50; // Reduced from unlimited
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
      .filter(([key]) => cache.has(key)) // Only include non-expired entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = sortedEntries.slice(0, cache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
};

export const getCachedData = <T>(key: string, ttl: number = 30000): T | null => {
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

export const setCachedData = <T>(key: string, data: T, ttl: number = 30000): void => {
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

// CRITICAL FIX: Disable realtime subscriptions temporarily to prevent resource exhaustion
export const createOptimizedRealtimeSubscription = (
  table: string,
  callback: (payload: unknown) => void,
  options: { event?: string; filter?: string; debounceMs?: number } = {}
) => {
  console.log(`Realtime subscription disabled for ${table} to prevent resource exhaustion`);
  return null;
  
  /*
  const { debounceMs = 2000 } = options; // Increased default debounce
  
  if (typeof WebSocket === 'undefined' || import.meta.env.SSR) {
    console.log('Realtime not available, skipping subscription');
    return null;
  }

  try {
    const channelName = `${table}_optimized_${Date.now()}`;
    
    let debounceTimer: NodeJS.Timeout;
    const debouncedCallback = (payload: unknown) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        try {
          callback(payload);
        } catch (error) {
          console.warn('Error in realtime callback:', error);
        }
      }, debounceMs);
    };
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: table,
          ...(options.filter && { filter: options.filter })
        },
        debouncedCallback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Optimized realtime subscription active for ${table}`);
        } else if (status === 'SUBSCRIPTION_ERROR') {
          console.warn(`Realtime subscription error for ${table} (non-critical)`);
        }
      });

    return channel;
  } catch (error) {
    console.warn('Failed to create realtime subscription:', error);
    return null;
  }
  */
};

// Batch database operations
export const batchOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 3 // Reduced from 5
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
      
      clearCache();
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

// CRITICAL FIX: Periodic cache cleanup to prevent memory leaks
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 60000); // Clean up every minute
}