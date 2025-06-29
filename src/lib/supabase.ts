import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
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
    if (window.location.hostname === 'scrubbed.online') {
      return 'https://scrubbed.online';
    }
    return window.location.origin;
  }
  return 'https://scrubbed.online';
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: getCurrentOrigin(),
    autoRefreshToken: true,
    persistSession: true, // ENABLED: Re-enable session persistence for better performance
    detectSessionInUrl: true,
    refreshTokenRetryCount: 2, // Increased from 1
    // Use localStorage for better performance
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
  // OPTIMIZED: Better realtime configuration for performance
  realtime: {
    params: {
      eventsPerSecond: 1, // Reduced from 2 for better performance
    },
    heartbeatIntervalMs: 60000, // Increased to 60 seconds
    reconnectAfterMs: (tries: number) => Math.min(tries * 2000, 30000), // Slower reconnection
    timeout: 20000, // Increased timeout
  },
});

// PERFORMANCE: Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const getCachedData = <T>(key: string, ttl: number = 30000): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  return null;
};

export const setCachedData = <T>(key: string, data: T, ttl: number = 30000): void => {
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

// OPTIMIZED: Debounced realtime subscription helper
let subscriptionDebounceTimer: NodeJS.Timeout;

export const createOptimizedRealtimeSubscription = (
  table: string,
  callback: (payload: unknown) => void,
  options: { event?: string; filter?: string; debounceMs?: number } = {}
) => {
  const { debounceMs = 1000 } = options;
  
  if (typeof WebSocket === 'undefined' || import.meta.env.SSR) {
    console.log('Realtime not available, skipping subscription');
    return null;
  }

  try {
    const channelName = `${table}_optimized_${Date.now()}`;
    
    const debouncedCallback = (payload: unknown) => {
      if (subscriptionDebounceTimer) {
        clearTimeout(subscriptionDebounceTimer);
      }
      
      subscriptionDebounceTimer = setTimeout(() => {
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
};

// PERFORMANCE: Batch database operations
export const batchOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
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
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const userTypeFromUrl = extractUserTypeFromUrl();
    
    if (userTypeFromUrl) {
      session.user.user_metadata = {
        ...session.user.user_metadata,
        user_type: userTypeFromUrl
      };
    }
    
    // Clear cache on sign in
    clearCache();
  } else if (event === 'SIGNED_OUT') {
    // Clear cache and localStorage on sign out
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