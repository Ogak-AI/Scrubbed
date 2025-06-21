import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { WasteRequest } from '../types';

export const useWasteRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserProfileExists = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Checking if profile exists for user:', user.id);
      
      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, user_type')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile for user:', user.id);
        
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

        console.log('Creating profile with data:', profileData);

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }

        console.log('Profile created successfully:', newProfile);
        return true;
      } else if (checkError) {
        console.error('Error checking profile:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      } else {
        console.log('Profile already exists:', existingProfile);
        return true;
      }
    } catch (err: any) {
      console.error('Error in ensureUserProfileExists:', err);
      throw err;
    }
  };

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching requests for user:', user.id, 'type:', user.userType);

      // Ensure user profile exists before fetching requests
      await ensureUserProfileExists();

      let query = supabase
        .from('waste_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter based on user type
      if (user.userType === 'dumper') {
        query = query.eq('dumper_id', user.id);
      } else if (user.userType === 'collector') {
        // Collectors can see their own requests and pending requests
        query = query.or(`collector_id.eq.${user.id},status.eq.pending`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      console.log('Fetched requests:', data);

      const formattedRequests: WasteRequest[] = (data || []).map(request => ({
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
        photos: request.photos,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      }));

      setRequests(formattedRequests);
      console.log('Set requests state:', formattedRequests);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.message);
      // Don't leave in loading state indefinitely
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createRequest = async (requestData: {
    wasteType: string;
    description?: string;
    location: { lat: number; lng: number };
    address: string;
    scheduledTime?: string;
    estimatedAmount?: string;
    photos?: string[];
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Creating request with data:', requestData);
      console.log('Current user:', user);

      // CRITICAL: Ensure user profile exists before creating request
      console.log('Ensuring profile exists before creating request...');
      await ensureUserProfileExists();
      console.log('Profile check completed');

      // Double-check that the profile exists by querying it
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', user.id)
        .single();

      if (profileError || !profileCheck) {
        console.error('Profile verification failed:', profileError);
        throw new Error('Failed to verify user profile. Please try signing out and signing in again.');
      }

      console.log('Profile verified:', profileCheck);

      const insertData = {
        dumper_id: user.id,
        waste_type: requestData.wasteType,
        description: requestData.description || null,
        location: requestData.location,
        address: requestData.address,
        scheduled_time: requestData.scheduledTime || null,
        estimated_amount: requestData.estimatedAmount || null,
        photos: requestData.photos || null,
        status: 'pending',
      };

      console.log('Inserting waste request with data:', insertData);

      const { data, error } = await supabase
        .from('waste_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Provide more specific error messages
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

      console.log('Successfully created request:', data);

      // Add the new request to the local state
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
        photos: data.photos,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setRequests(prev => [newRequest, ...prev]);
      console.log('Added request to state');
      return newRequest;
    } catch (err: any) {
      console.error('Error creating request:', err);
      throw err;
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user || user.userType !== 'collector') {
      throw new Error('Only collectors can accept requests');
    }

    try {
      // Ensure user profile exists
      await ensureUserProfileExists();

      const { data, error } = await supabase
        .from('waste_requests')
        .update({
          collector_id: user.id,
          status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow accepting pending requests
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

      return data;
    } catch (err: any) {
      console.error('Error accepting request:', err);
      throw err;
    }
  };

  const updateRequestStatus = async (requestId: string, status: WasteRequest['status']) => {
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

      return data;
    } catch (err: any) {
      console.error('Error updating request status:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User changed, fetching requests');
      fetchRequests();
    }
  }, [user, fetchRequests]);

  // Set up real-time subscription with error handling
  useEffect(() => {
    if (!user) return;

    let retryCount = 0;
    const maxRetries = 3;

    const setupSubscription = () => {
      console.log('Setting up real-time subscription');
      
      const channel = supabase
        .channel('waste_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'waste_requests',
          },
          (payload) => {
            console.log('Real-time update:', payload);
            // Only refetch if the change is relevant to this user
            if (payload.new && (
              payload.new.dumper_id === user.id || 
              payload.new.collector_id === user.id ||
              payload.new.status === 'pending'
            )) {
              fetchRequests();
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying subscription (${retryCount}/${maxRetries})`);
            setTimeout(setupSubscription, 1000 * retryCount);
          }
        });

      return channel;
    };

    const channel = setupSubscription();

    return () => {
      if (channel) {
        console.log('Cleaning up subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchRequests]);

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