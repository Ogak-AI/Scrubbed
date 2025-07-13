import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getCachedData, setCachedData, clearCache } from '../lib/supabase';
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

        setCachedData(profileCacheKey, true, 600000); // Cache for 10 minutes
        return true;
      } else if (checkError) {
        throw new Error(`Database error: ${checkError.message}`);
      } else {
        setCachedData(profileCacheKey, true, 600000);
        return true;
      }
    } catch (err: unknown) {
      console.error('Error in ensureUserProfileExists:', err);
      throw err;
    }
  }, [user]);

  // CRITICAL FIX: Enhanced fetch with better persistence
  const fetchRequests = useCallback(async (forceRefresh = false) => {
    if (!user || !cacheKey) {
      return;
    }

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = getCachedData<WasteRequest[]>(cacheKey);
      if (cached && initialized) {
        setRequests(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure profile exists before fetching requests
      await ensureUserProfileExists();

      // Enhanced query with better error handling
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
        .limit(50); // Increased limit for better data persistence

      // More efficient filtering
      if (user.userType === 'dumper') {
        query = query.eq('dumper_id', user.id);
      } else if (user.userType === 'collector') {
        // For collectors, get their jobs and pending requests
        const [myJobsQuery, pendingQuery] = await Promise.all([
          supabase
            .from('waste_requests')
            .select('*')
            .eq('collector_id', user.id)
            .order('created_at', { ascending: false })
            .limit(25),
          supabase
            .from('waste_requests')
            .select('*')
            .eq('status', 'pending')
            .is('collector_id', null)
            .order('created_at', { ascending: false })
            .limit(25)
        ]);

        if (myJobsQuery.error) throw myJobsQuery.error;
        if (pendingQuery.error) throw pendingQuery.error;

        // Combine and deduplicate results
        const combined = [...(myJobsQuery.data || []), ...(pendingQuery.data || [])];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        const formattedRequests: WasteRequest[] = unique.map(request => ({
          id: request.id,
          dumperId: request.dumper_id,
          collectorId: request.collector_id,
          wasteType: request.waste_type,
          description: request.description,
          location: request.location as { lat: number; lng: number },
          address: request.address,
          status: request.status as WasteRequest['status'],
          scheduledTime: request.scheduled_time,
          estimatedAmount: request.estimated_amount,
          price: request.price,
          photos: request.photos,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
        }));

        setRequests(formattedRequests);
        // Cache for 10 minutes for better persistence
        setCachedData(cacheKey, formattedRequests, 600000);
        setInitialized(true);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Enhanced data transformation with better error handling
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
      
      // Cache for 10 minutes for better persistence
      setCachedData(cacheKey, formattedRequests, 600000);
      setInitialized(true);
      
    } catch (err: unknown) {
      console.error('Error fetching requests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(errorMessage);
      
      // Try to use cached data even if fetch fails
      const cached = getCachedData<WasteRequest[]>(cacheKey);
      if (cached) {
        setRequests(cached);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, cacheKey, ensureUserProfileExists, initialized]);

  // ENHANCED: Create request with immediate local update
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

      // IMMEDIATE local state update for better UX
      setRequests(prev => [newRequest, ...prev]);
      
      // Update cache immediately
      if (cacheKey) {
        const updatedRequests = [newRequest, ...requests];
        setCachedData(cacheKey, updatedRequests, 600000);
      }
      
      return newRequest;
    } catch (err: unknown) {
      console.error('Error creating request:', err);
      throw err;
    }
  }, [user, ensureUserProfileExists, cacheKey, requests]);

  // ENHANCED: Accept request with immediate local update
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

      // IMMEDIATE local state update
      setRequests(prev => prev.map(request => 
        request.id === requestId 
          ? { ...request, collectorId: user.id, status: 'matched' as const, updatedAt: new Date().toISOString() }
          : request
      ));

      // Update cache immediately
      if (cacheKey) {
        const updatedRequests = requests.map(request => 
          request.id === requestId 
            ? { ...request, collectorId: user.id, status: 'matched' as const, updatedAt: new Date().toISOString() }
            : request
        );
        setCachedData(cacheKey, updatedRequests, 600000);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error accepting request:', err);
      throw err;
    }
  }, [user, ensureUserProfileExists, cacheKey, requests]);

  // ENHANCED: Update status with immediate local update
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

      // IMMEDIATE local state update
      const updatedAt = new Date().toISOString();
      setRequests(prev => prev.map(request => 
        request.id === requestId 
          ? { ...request, status, updatedAt }
          : request
      ));

      // Update cache immediately
      if (cacheKey) {
        const updatedRequests = requests.map(request => 
          request.id === requestId 
            ? { ...request, status, updatedAt }
            : request
        );
        setCachedData(cacheKey, updatedRequests, 600000);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error updating request status:', err);
      throw err;
    }
  }, [user, cacheKey, requests]);

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

  // Enhanced refetch function that forces refresh
  const refetch = useCallback(() => {
    return fetchRequests(true);
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    createRequest,
    acceptRequest,
    updateRequestStatus,
    refetch,
  };
};