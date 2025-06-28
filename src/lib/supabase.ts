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
  // IMPROVED: Better realtime configuration to prevent WebSocket errors
  realtime: {
    params: {
      eventsPerSecond: 2, // Reduced from 3 to be more conservative
    },
    // Add heartbeat and timeout settings
    heartbeatIntervalMs: 30000, // 30 seconds
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000), // Exponential backoff up to 10s
    timeout: 10000, // 10 second timeout
    // Disable realtime in development if needed
    ...(import.meta.env.DEV && {
      transport: 'websocket',
      logger: (kind: string, msg: string, data?: any) => {
        if (kind === 'error') {
          console.warn('Realtime error (non-critical):', msg, data);
        }
      }
    })
  },
});

// Function to extract user type from OAuth state
const extractUserTypeFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check URL hash for state parameter
    const hash = window.location.hash;
    if (hash.includes('state=')) {
      const stateMatch = hash.match(/state=([^&]+)/);
      if (stateMatch) {
        const decodedState = decodeURIComponent(stateMatch[1]);
        const stateData = JSON.parse(atob(decodedState));
        console.log('Extracted state data:', stateData);
        return stateData.user_type || null;
      }
    }
    
    // Check URL search params as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    if (state) {
      const stateData = JSON.parse(atob(state));
      console.log('Extracted state data from search:', stateData);
      return stateData.user_type || null;
    }
  } catch (error) {
    console.warn('Failed to extract user type from URL state:', error);
  }
  
  return null;
};

// Enhanced auth state change handler with OAuth state processing
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event);
  
  if (event === 'SIGNED_IN' && session?.user) {
    // Extract user type from OAuth state and update user metadata
    const userTypeFromUrl = extractUserTypeFromUrl();
    
    if (userTypeFromUrl) {
      console.log('Setting user type from OAuth state:', userTypeFromUrl);
      
      // Update the user metadata with the correct user type
      session.user.user_metadata = {
        ...session.user.user_metadata,
        user_type: userTypeFromUrl
      };
      
      console.log('Updated user metadata:', session.user.user_metadata);
    }
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any remaining localStorage data
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('pending_user_type');
        localStorage.removeItem('sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    }
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in successfully');
  }
});

// Helper function to check if realtime is available
export const isRealtimeAvailable = () => {
  try {
    return typeof WebSocket !== 'undefined' && 
           !import.meta.env.SSR && 
           navigator.onLine !== false;
  } catch {
    return false;
  }
};

// Helper function to safely create realtime subscriptions
export const createSafeRealtimeSubscription = (
  table: string,
  callback: (payload: any) => void,
  options: { event?: string; filter?: string } = {}
) => {
  if (!isRealtimeAvailable()) {
    console.log('Realtime not available, skipping subscription');
    return null;
  }

  try {
    const channel = supabase
      .channel(`${table}_changes_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: table,
          ...(options.filter && { filter: options.filter })
        },
        (payload) => {
          try {
            callback(payload);
          } catch (error) {
            console.warn('Error in realtime callback:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.warn(`Realtime subscription error for ${table} (non-critical)`);
        } else if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscription active for ${table}`);
        }
      });

    return channel;
  } catch (error) {
    console.warn('Failed to create realtime subscription:', error);
    return null;
  }
};