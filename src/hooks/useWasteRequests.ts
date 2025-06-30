import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, createOptimizedRealtimeSubscription, getCachedData, setCachedData, clearCache } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { WasteRequest } from '../types';

interface CreateRequestData {
  wasteType: string;
  description?: string;
  location: { lat: number; lng: number };
  address: string;
  scheduledTime?: string;
  estimatedAmount?: string;
  price?: number;
  photos?: string[];
}

export const useWasteRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // PERFORMANCE: Memoize cache key
  const cacheKey = useMemo(() => 
    user ? `waste_requests_${user.id}_${user.userType}` : null, 
    [user?.id, user?.userType]
  );

  const ensureUserProfileExists = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const profileCacheKey = `profile_exists_${user.id}`;
    const cached = getCachedData<boolean>(profileCacheKey);
    if (cached) return true;

    try {
      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, user_type')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.fullName || null,
          user_type: user.userType || 'dumper',
          phone: user.phone || null,
          address: user.address || null,
          email_verified: user.emailVerified || true,
          phone_verified: user.phoneVerified || false,
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }

        setCachedData(profileCacheKey, true, 300000); // Cache for 5 minutes
        return true;
      } else if (checkError) {
        throw new Error(`Database error: ${checkError.message}`);
      } else {
        setCachedData(profileCacheKey, true, 300000);
        return true;
      }
    } catch (err: unknown) {
      console.error('Error in ensureUserProfileExists:', err);
      throw err;
    }
  }, [user]);

  // CRITICAL FIX: Prevent infinite loops with better state management
  const fetchRequests = useCallback(async () => {
    if (!user || !cacheKey || loading) {
      return;
    }

    // Check cache first
    const cached = getCachedData<WasteRequest[]>(cacheKey);
    if (cached && initialized) {
      setRequests(cached);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Shorter timeout for better UX
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 3000); // Reduced to 3 seconds
      });

      const fetchPromise = (async () => {
        // Only ensure profile exists if we haven't initialized yet
        if (!initialized) {
          await ensureUserProfileExists();
        }

        // OPTIMIZED: More efficient query with specific columns and better limits
        let query = supabase
          .from('waste_requests')
          .select(`
            id,
            dumper_id,
            collector_id,
            waste_type,
            description,
            location,
            address,
            status,
            scheduled_time,
            estimated_amount,
            price,
            photos,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false })
          .limit(20); // Reduced limit for better performance

        // More efficient filtering
        if (user.userType === 'dumper') {
          query = query.eq('dumper_id', user.id);
        } else if (user.userType === 'collector') {
          // For collectors, get their jobs and pending requests in separate queries for better performance
          const [myJobsQuery, pendingQuery] = await Promise.all([
            supabase
              .from('waste_requests')
              .select('*')
              .eq('collector_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10),
            supabase
              .from('waste_requests')
              .select('*')
              .eq('status', 'pending')
              .is('collector_id', null)
              .order('created_at', { ascending: false })
              .limit(10)
          ]);

          if (myJobsQuery.error) throw myJobsQuery.error;
          if (pendingQuery.error) throw pendingQuery.error;

          // Combine and deduplicate results
          const combined = [...(myJobsQuery.data || []), ...(pendingQuery.data || [])];
          const unique = combined.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
          );
          
          return unique;
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        return data;
      })();

      const data = await Promise.race([fetchPromise, timeoutPromise]) as Array<Record<string, unknown>>;

      // OPTIMIZED: More efficient data transformation
      const formattedRequests: WasteRequest[] = (data || []).map(request => ({
        id: request.id as string,
        dumperId: request.dumper_id as string,
        collectorId: request.collector_id as string | null,
        wasteType: request.waste_type as string,
        description: request.description as string | null,
        location: request.location as { lat: number; lng: number },
        address: request.address as string,
        status: request.status as WasteRequest['status'],
        scheduledTime: request.scheduled_time as string | null,
        estimatedAmount: request.estimated_amount as string | null,
        price: request.price as number | null,
        photos: request.photos as string[] | null,
        createdAt: request.created_at as string,
        updatedAt: request.updated_at as string,
      }));

      setRequests(formattedRequests);
      
      // Cache the results for 2 minutes
      setCachedData(cacheKey, formattedRequests, 120000);
      setInitialized(true);
      
    } catch (err: unknown) {
      console.error('Error fetching requests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(errorMessage);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user, cacheKey, ensureUserProfileExists, loading, initialized]);

  // PERFORMANCE: Optimized create request function
  const createRequest = useCallback(async (requestData: CreateRequestData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await ensureUserProfileExists();

      // Verify profile exists
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', user.id)
        .single();

      if (profileError || !profileCheck) {
        throw new Error('Failed to verify user profile. Please try signing out and signing in again.');
      }

      const insertData = {
        dumper_id: user.id,
        waste_type: requestData.wasteType,
        description: requestData.description || null,
        location: requestData.location,
        address: requestData.address,
        scheduled_time: requestData.scheduledTime || null,
        estimated_amount: requestData.estimatedAmount || null,
        price: requestData.price || null,
        photos: requestData.photos || null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('waste_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          if (error.message.includes('dumper_id_fkey')) {
            throw new Error('Your user profile is missing from the database. Please sign out and sign in again to recreate your profile.');
          } else {
            throw new Error('Database constraint violation. Please contact support if this persists.');
          }
        } else if (error.message.includes('dumper_id_fkey')) {
          throw new Error('User profile not found in database. Please refresh the page and try again.');
        } else {
          throw new Error(`Failed to create request: ${error.message}`);
        }
      }

      const newRequest: WasteRequest = {
        id: data.id,
        dumperId: data.dumper_id,
        collectorId: data.collector_id,
        wasteType: data.waste_type,
        description: data.description,
        location: data.location as { lat: number; lng: number },
        address: data.address,
        status: data.status as WasteRequest['status'],
        scheduledTime: data.scheduled_time,
        estimatedAmount: data.estimated_amount,
        price: data.price,
        photos: data.photos,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Update local state and cache
      setRequests(prev => [newRequest, ...prev]);
      if (cacheKey) {
        clearCache(cacheKey); // Clear cache to force refresh
      }
      
      return newRequest;
    } catch (err: unknown) {
      console.error('Error creating request:', err);
      throw err;
    }
  }, [user, ensureUserProfileExists, cacheKey]);

  // PERFORMANCE: Optimized accept request function
  const acceptRequest = useCallback(async (requestId: string) => {
    if (!user || user.userType !== 'collector') {
      throw new Error('Only collectors can accept requests');
    }

    try {
      await ensureUserProfileExists();

      const { data, error } = await supabase
        .from('waste_requests')
        .update({
          collector_id: user.id,
          status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          throw new Error('Your collector profile is not properly set up. Please complete your profile setup.');
        }
        throw error;
      }

      // Update local state
      setRequests(prev => prev.map(request => 
        request.id === requestId 
          ? { ...request, collectorId: user.id, status: 'matched' as const }
          : request
      ));

      // Clear cache to force refresh
      if (cacheKey) {
        clearCache(cacheKey);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error accepting request:', err);
      throw err;
    }
  }, [user, ensureUserProfileExists, cacheKey]);

  // PERFORMANCE: Optimized status update function
  const updateRequestStatus = useCallback(async (requestId: string, status: WasteRequest['status']) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('waste_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(request => 
        request.id === requestId 
          ? { ...request, status }
          : request
      ));

      // Clear cache to force refresh
      if (cacheKey) {
        clearCache(cacheKey);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error updating request status:', err);
      throw err;
    }
  }, [user, cacheKey]);

  // CRITICAL FIX: Only fetch once on mount and when user changes
  useEffect(() => {
    let mounted = true;
    
    if (user && !initialized) {
      fetchRequests().finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    } else if (!user) {
      setLoading(false);
      setRequests([]);
      setInitialized(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.userType]); // Only depend on user ID and type

  // CRITICAL FIX: Disable real-time subscriptions temporarily to prevent resource exhaustion
  // This can be re-enabled once the core issues are resolved
  /*
  useEffect(() => {
    if (!user || !initialized) return;

    let channel: ReturnType<typeof createOptimizedRealtimeSubscription> = null;
    
    const setupSubscription = () => {
      const debouncedRefetch = () => {
        if (document.visibilityState === 'visible') {
          // Clear cache before refetch to ensure fresh data
          if (cacheKey) {
            clearCache(cacheKey);
          }
          fetchRequests();
        }
      };
      
      channel = createOptimizedRealtimeSubscription(
        'waste_requests',
        (payload) => {
          if (payload && typeof payload === 'object' && 'new' in payload) {
            const newData = payload.new as { dumper_id?: string; collector_id?: string; status?: string };
            if (newData && (
              newData.dumper_id === user.id || 
              newData.collector_id === user.id ||
              (user.userType === 'collector' && newData.status === 'pending')
            )) {
              debouncedRefetch();
            }
          }
        },
        {
          filter: user.userType === 'dumper' ? `dumper_id=eq.${user.id}` : undefined,
          debounceMs: 5000 // Increased debounce for better performance
        }
      );

      return channel;
    };

    const subscription = setupSubscription();

    return () => {
      if (subscription) {
        if (typeof subscription === 'object' && subscription !== null && 'unsubscribe' in subscription) {
          (subscription as { unsubscribe: () => void }).unsubscribe();
        } else {
          supabase.removeChannel(subscription);
        }
      }
    };
  }, [user?.id, user?.userType, cacheKey, fetchRequests, initialized]);
  */

  return {
    requests,
    loading,
    error,
    createRequest,
    acceptRequest,
    updateRequestStatus,
    refetch: fetchRequests,
  };
};