import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Collector } from '../types';

export const useCollectors = () => {
  const { user } = useAuth();
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [myCollectorProfile, setMyCollectorProfile] = useState<Collector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserProfileExists = async () => {
    if (!user) return false;

    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
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
    } catch (err: any) {
      console.error('Error ensuring profile exists:', err);
      throw err;
    }
  };

  const fetchCollectors = async () => {
    try {
      setLoading(true);
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
    } catch (err: any) {
      console.error('Error fetching collectors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCollectorProfile = async () => {
    if (!user || user.userType !== 'collector') return;

    try {
      const { data, error } = await supabase
        .from('collectors')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching collector profile:', error);
        return;
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
      }
    } catch (err: any) {
      console.error('Error fetching my collector profile:', err);
    }
  };

  const createCollectorProfile = async (profileData: {
    specializations: string[];
    serviceRadius: number;
    vehicleType?: string;
    experience?: string;
  }) => {
    if (!user || user.userType !== 'collector') {
      throw new Error('Only collectors can create collector profiles');
    }

    try {
      // Ensure user profile exists first
      await ensureUserProfileExists();

      const { data, error } = await supabase
        .from('collectors')
        .insert({
          profile_id: user.id,
          specializations: profileData.specializations,
          service_radius: profileData.serviceRadius,
          is_available: true,
          total_collections: 0,
        })
        .select()
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
      return newCollectorProfile;
    } catch (err: any) {
      console.error('Error creating collector profile:', err);
      throw err;
    }
  };

  const updateAvailability = async (isAvailable: boolean) => {
    if (!myCollectorProfile) throw new Error('No collector profile found');

    try {
      const { error } = await supabase
        .from('collectors')
        .update({
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myCollectorProfile.id);

      if (error) throw error;

      setMyCollectorProfile(prev => prev ? { ...prev, isAvailable } : null);
    } catch (err: any) {
      console.error('Error updating availability:', err);
      throw err;
    }
  };

  const updateLocation = async (location: { lat: number; lng: number }) => {
    if (!myCollectorProfile) throw new Error('No collector profile found');

    try {
      const { error } = await supabase
        .from('collectors')
        .update({
          current_location: location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myCollectorProfile.id);

      if (error) throw error;

      setMyCollectorProfile(prev => prev ? { ...prev, currentLocation: location } : null);
    } catch (err: any) {
      console.error('Error updating location:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCollectors();
    if (user?.userType === 'collector') {
      fetchMyCollectorProfile();
    }
  }, [user]);

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