import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Collector } from '../types';

export const useCollectors = () => {
  const { user } = useAuth();
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [myCollectorProfile, setMyCollectorProfile] = useState<Collector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserProfileExists = useCallback(async () => {
    if (!user) return false;

    try {
      // Check if profile exists
      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating missing profile for collector:', user.id);
        
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
          console.error('Error creating profile:', insertError);
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }

        console.log('Profile created successfully');
        return true;
      } else if (checkError) {
        throw checkError;
      }

      return true; // Profile exists
    } catch (err: unknown) {
      console.error('Error ensuring profile exists:', err);
      throw err;
    }
  }, [user]);

  const fetchCollectors = useCallback(async () => {
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('collectors')
        .select('*')
        .eq('is_available', true)
        .order('rating', { ascending: false, nullsLast: true });

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
    } catch (err: unknown) {
      console.error('Error fetching collectors:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collectors';
      setError(errorMessage);
    }
  }, []);

  const fetchMyCollectorProfile = useCallback(async () => {
    if (!user || user.userType !== 'collector') {
      return;
    }

    try {
      setError(null);
      console.log('Fetching collector profile for user:', user.id);

      // Use a more specific query to avoid 406 errors
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
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (error) {
        console.error('Error fetching collector profile:', error);
        
        // If it's a 406 error or similar, it might be due to RLS policies
        if (error.code === 'PGRST301' || error.message.includes('406')) {
          console.log('Possible RLS policy issue, collector profile may not exist yet');
          setMyCollectorProfile(null);
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

        console.log('Collector profile found:', collectorProfile);
        setMyCollectorProfile(collectorProfile);
      } else {
        console.log('No collector profile found for user:', user.id);
        setMyCollectorProfile(null);
      }
    } catch (err: unknown) {
      console.error('Error fetching my collector profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collector profile';
      setError(errorMessage);
      setMyCollectorProfile(null);
    }
  }, [user]);

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
      console.log('Creating collector profile for user:', user.id);

      // Ensure user profile exists first
      await ensureUserProfileExists();

      const insertData = {
        profile_id: user.id,
        specializations: profileData.specializations,
        service_radius: profileData.serviceRadius,
        is_available: true,
        total_collections: 0,
      };

      console.log('Inserting collector profile with data:', insertData);

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
        console.error('Error creating collector profile:', error);
        
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

      console.log('Collector profile created successfully:', newCollectorProfile);
      setMyCollectorProfile(newCollectorProfile);
      return newCollectorProfile;
    } catch (err: unknown) {
      console.error('Error creating collector profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collector profile';
      setError(errorMessage);
      throw err;
    }
  }, [user, ensureUserProfileExists]);

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

      setMyCollectorProfile(prev => prev ? { ...prev, isAvailable } : null);
    } catch (err: unknown) {
      console.error('Error updating availability:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update availability';
      setError(errorMessage);
      throw err;
    }
  }, [myCollectorProfile]);

  const updateLocation = useCallback(async (location: { lat: number; lng: number }) => {
    if (!myCollectorProfile) throw new Error('No collector profile found');

    try {
      setError(null);
      
      const { error } = await supabase
        .from('collectors')
        .update({
          current_location: location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myCollectorProfile.id);

      if (error) throw error;

      setMyCollectorProfile(prev => prev ? { ...prev, currentLocation: location } : null);
    } catch (err: unknown) {
      console.error('Error updating location:', err);
      // Don't set error state for location updates as they're not critical
      console.warn('Location update failed, continuing without error');
    }
  }, [myCollectorProfile]);

  useEffect(() => {
    const initializeCollectors = async () => {
      try {
        setLoading(true);
        setError(null);

        // Always fetch available collectors
        await fetchCollectors();

        // Only fetch collector profile if user is a collector
        if (user?.userType === 'collector') {
          await fetchMyCollectorProfile();
        }
      } catch (err: unknown) {
        console.error('Error initializing collectors:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize collectors';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializeCollectors();
    } else {
      setLoading(false);
    }
  }, [user, fetchCollectors, fetchMyCollectorProfile]);

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