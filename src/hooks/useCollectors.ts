import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getCachedData, setCachedData, clearCache } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Collector } from '../types';

export const useCollectors = () => {
  const { user } = useAuth();
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [myCollectorProfile, setMyCollectorProfile] = useState<Collector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // PERFORMANCE: Memoize cache keys
  const collectorsCacheKey = 'available_collectors';
  const myProfileCacheKey = useMemo(() => 
    user ? `my_collector_profile_${user.id}` : null, 
    [user?.id]
  );

  const ensureUserProfileExists = useCallback(async () => {
    if (!user) return false;

    const cacheKey = `profile_exists_${user.id}`;
    const cached = getCachedData<boolean>(cacheKey);
    if (cached) return true;

    try {
      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            user_type: user.userType,
            phone: user.phone,
            address: user.address,
            email_verified: user.emailVerified,
            phone_verified: user.phoneVerified,
          });

        if (insertError) {
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }

        setCachedData(cacheKey, true, 300000);
        return true;
      } else if (checkError) {
        throw checkError;
      }

      setCachedData(cacheKey, true, 300000);
      return true;
    } catch (err: unknown) {
      console.error('Error ensuring profile exists:', err);
      throw err;
    }
  }, [user]);

  // CRITICAL FIX: Prevent infinite loops
  const fetchCollectors = useCallback(async () => {
    if (loading) return;

    // Check cache first
    const cached = getCachedData<Collector[]>(collectorsCacheKey);
    if (cached && initialized) {
      setCollectors(cached);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('collectors')
        .select('*')
        .eq('is_available', true)
        .order('rating', { ascending: false, nullsLast: true })
        .limit(15); // Reduced limit for better performance

      if (fetchError) throw fetchError;

      const formattedCollectors: Collector[] = (data || []).map(collector => ({
        id: collector.id,
        profileId: collector.profile_id,
        specializations: collector.specializations || [],
        serviceRadius: collector.service_radius || 10,
        isAvailable: collector.is_available,
        currentLocation: collector.current_location as { lat: number; lng: number } | null,
        rating: collector.rating,
        totalCollections: collector.total_collections || 0,
        createdAt: collector.created_at,
        updatedAt: collector.updated_at,
      }));

      setCollectors(formattedCollectors);
      
      // Cache for 5 minutes
      setCachedData(collectorsCacheKey, formattedCollectors, 300000);
      setInitialized(true);
    } catch (err: unknown) {
      console.error('Error fetching collectors:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collectors';
      setError(errorMessage);
    }
  }, [loading, initialized]);

  // CRITICAL FIX: Prevent infinite loops
  const fetchMyCollectorProfile = useCallback(async () => {
    if (!user || user.userType !== 'collector' || !myProfileCacheKey || loading) {
      return;
    }

    // Check cache first
    const cached = getCachedData<Collector | null>(myProfileCacheKey);
    if (cached !== null && initialized) {
      setMyCollectorProfile(cached);
      return;
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('collectors')
        .select(`
          id,
          profile_id,
          specializations,
          service_radius,
          is_available,
          current_location,
          rating,
          total_collections,
          created_at,
          updated_at
        `)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('406')) {
          setMyCollectorProfile(null);
          setCachedData(myProfileCacheKey, null, 300000);
          return;
        }
        throw error;
      }

      if (data) {
        const collectorProfile: Collector = {
          id: data.id,
          profileId: data.profile_id,
          specializations: data.specializations || [],
          serviceRadius: data.service_radius || 10,
          isAvailable: data.is_available,
          currentLocation: data.current_location as { lat: number; lng: number } | null,
          rating: data.rating,
          totalCollections: data.total_collections || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setMyCollectorProfile(collectorProfile);
        setCachedData(myProfileCacheKey, collectorProfile, 300000);
      } else {
        setMyCollectorProfile(null);
        setCachedData(myProfileCacheKey, null, 300000);
      }
    } catch (err: unknown) {
      console.error('Error fetching my collector profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collector profile';
      setError(errorMessage);
      setMyCollectorProfile(null);
    }
  }, [user, myProfileCacheKey, loading, initialized]);

  // PERFORMANCE: Optimized create collector profile
  const createCollectorProfile = useCallback(async (profileData: {
    specializations: string[];
    serviceRadius: number;
    vehicleType?: string;
    experience?: string;
  }) => {
    if (!user || user.userType !== 'collector') {
      throw new Error('Only collectors can create collector profiles');
    }

    try {
      setError(null);
      
      await ensureUserProfileExists();

      const insertData = {
        profile_id: user.id,
        specializations: profileData.specializations,
        service_radius: profileData.serviceRadius,
        is_available: true,
        total_collections: 0,
      };

      const { data, error } = await supabase
        .from('collectors')
        .insert(insertData)
        .select(`
          id,
          profile_id,
          specializations,
          service_radius,
          is_available,
          current_location,
          rating,
          total_collections,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        if (error.code === '23503') {
          throw new Error('Your user profile is not properly set up. Please try signing out and signing in again.');
        }
        throw error;
      }

      const newCollectorProfile: Collector = {
        id: data.id,
        profileId: data.profile_id,
        specializations: data.specializations || [],
        serviceRadius: data.service_radius || 10,
        isAvailable: data.is_available,
        currentLocation: data.current_location as { lat: number; lng: number } | null,
        rating: data.rating,
        totalCollections: data.total_collections || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setMyCollectorProfile(newCollectorProfile);
      
      // Update cache
      if (myProfileCacheKey) {
        setCachedData(myProfileCacheKey, newCollectorProfile, 300000);
      }
      
      // Clear collectors cache to include new profile
      clearCache(collectorsCacheKey);
      
      return newCollectorProfile;
    } catch (err: unknown) {
      console.error('Error creating collector profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collector profile';
      setError(errorMessage);
      throw err;
    }
  }, [user, ensureUserProfileExists, myProfileCacheKey]);

  // PERFORMANCE: Optimized availability update
  const updateAvailability = useCallback(async (isAvailable: boolean) => {
    if (!myCollectorProfile) throw new Error('No collector profile found');

    try {
      setError(null);
      
      const { error } = await supabase
        .from('collectors')
        .update({
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myCollectorProfile.id);

      if (error) throw error;

      const updatedProfile = { ...myCollectorProfile, isAvailable };
      setMyCollectorProfile(updatedProfile);
      
      // Update cache
      if (myProfileCacheKey) {
        setCachedData(myProfileCacheKey, updatedProfile, 300000);
      }
      
      // Clear collectors cache
      clearCache(collectorsCacheKey);
    } catch (err: unknown) {
      console.error('Error updating availability:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update availability';
      setError(errorMessage);
      throw err;
    }
  }, [myCollectorProfile, myProfileCacheKey]);

  // PERFORMANCE: Optimized location update (non-critical, no error throwing)
  const updateLocation = useCallback(async (location: { lat: number; lng: number }) => {
    if (!myCollectorProfile) return;

    try {
      const { error } = await supabase
        .from('collectors')
        .update({
          current_location: location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myCollectorProfile.id);

      if (error) {
        console.warn('Location update failed:', error);
        return;
      }

      const updatedProfile = { ...myCollectorProfile, currentLocation: location };
      setMyCollectorProfile(updatedProfile);
      
      // Update cache
      if (myProfileCacheKey) {
        setCachedData(myProfileCacheKey, updatedProfile, 300000);
      }
    } catch (err: unknown) {
      console.warn('Location update failed:', err);
    }
  }, [myCollectorProfile, myProfileCacheKey]);

  // CRITICAL FIX: Only initialize once
  useEffect(() => {
    let mounted = true;
    
    const initializeCollectors = async () => {
      if (initialized || loading) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch collectors in parallel with profile if user is collector
        const promises = [fetchCollectors()];
        
        if (user?.userType === 'collector') {
          promises.push(fetchMyCollectorProfile());
        }

        await Promise.all(promises);
      } catch (err: unknown) {
        console.error('Error initializing collectors:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize collectors';
        setError(errorMessage);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (user && !initialized) {
      initializeCollectors();
    } else if (!user) {
      setLoading(false);
      setInitialized(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.userType]); // Only depend on user ID and type

  return {
    collectors,
    myCollectorProfile,
    loading,
    error,
    createCollectorProfile,
    updateAvailability,
    updateLocation,
    refetch: fetchCollectors,
  };
};