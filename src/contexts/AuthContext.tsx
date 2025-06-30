import React, { createContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User as SupabaseUser, Session, PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase, getCachedData, setCachedData, clearCache } from '../lib/supabase';
import type { User, VerificationState } from '../types';
import type { Database } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  verification: VerificationState;
  signInWithGoogle: (userType: 'dumper' | 'collector') => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  sendPhoneVerification: (phone: string) => Promise<void>;
  verifyPhoneCode: (code: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    emailSent: false,
    phoneSent: false,
    emailVerified: false,
    phoneVerified: false,
    isVerifying: false,
    error: null,
  });

  // FIXED: Use dynamic redirect URL instead of hardcoded domain
  const redirectUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:5173';
  }, []);

  // CRITICAL FIX: Enhanced user type extraction with better fallback logic
  const extractUserTypeFromUrl = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // First, check the hash for OAuth callback
      const hash = window.location.hash;
      if (hash.includes('access_token') && hash.includes('state=')) {
        const stateMatch = hash.match(/state=([^&]+)/);
        if (stateMatch) {
          const decodedState = decodeURIComponent(stateMatch[1]);
          console.log('Extracted state from hash:', decodedState);
          const stateData = JSON.parse(atob(decodedState));
          console.log('Parsed state data:', stateData);
          return stateData.user_type || null;
        }
      }
      
      // Check URL search params
      const urlParams = new URLSearchParams(window.location.search);
      const state = urlParams.get('state');
      if (state) {
        console.log('Extracted state from search params:', state);
        const stateData = JSON.parse(atob(state));
        console.log('Parsed state data from search:', stateData);
        return stateData.user_type || null;
      }

      // Check current path for user type
      const path = window.location.pathname;
      if (path.includes('/auth/collector')) {
        console.log('Detected collector from path');
        return 'collector';
      } else if (path.includes('/auth/dumper')) {
        console.log('Detected dumper from path');
        return 'dumper';
      }
    } catch (error) {
      console.warn('Failed to extract user type from URL:', error);
    }
    
    return null;
  }, []);

  // CRITICAL FIX: Enhanced user type storage and retrieval
  const storeUserTypeForOAuth = useCallback((userType: string) => {
    if (typeof window !== 'undefined') {
      console.log('Storing user type for OAuth:', userType);
      localStorage.setItem('pending_user_type', userType);
      localStorage.setItem('oauth_user_type', userType);
      // Also store with timestamp for debugging
      localStorage.setItem('oauth_user_type_timestamp', Date.now().toString());
    }
  }, []);

  const getPendingUserType = useCallback((): string | null => {
    if (typeof window !== 'undefined') {
      // Check multiple storage keys for user type
      const pendingType = localStorage.getItem('pending_user_type');
      const oauthType = localStorage.getItem('oauth_user_type');
      
      console.log('Getting pending user type:', { pendingType, oauthType });
      
      if (pendingType) {
        console.log('Found pending user type:', pendingType);
        return pendingType;
      }
      
      if (oauthType) {
        console.log('Found OAuth user type:', oauthType);
        return oauthType;
      }
    }
    return null;
  }, []);

  const clearUserTypeStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pending_user_type');
      localStorage.removeItem('oauth_user_type');
      localStorage.removeItem('oauth_user_type_timestamp');
    }
  }, []);

  // PERFORMANCE: Optimized display name function
  const getDisplayName = useCallback((supabaseUser: SupabaseUser): string => {
    return supabaseUser.user_metadata?.full_name ||
           supabaseUser.user_metadata?.name ||
           (supabaseUser.user_metadata?.given_name && supabaseUser.user_metadata?.family_name 
             ? `${supabaseUser.user_metadata.given_name} ${supabaseUser.user_metadata.family_name}`
             : supabaseUser.user_metadata?.given_name) ||
           (supabaseUser.email ? supabaseUser.email.split('@')[0].charAt(0).toUpperCase() + supabaseUser.email.split('@')[0].slice(1) : 'User');
  }, []);

  // CRITICAL FIX: Enhanced user type determination with proper priority
  const determineUserType = useCallback((supabaseUser: SupabaseUser): 'dumper' | 'collector' => {
    console.log('Determining user type for user:', supabaseUser.id);
    console.log('User metadata:', supabaseUser.user_metadata);
    console.log('App metadata:', supabaseUser.app_metadata);

    // Priority 1: Check user metadata (set during OAuth)
    if (supabaseUser.user_metadata?.user_type) {
      console.log('Found user type in user_metadata:', supabaseUser.user_metadata.user_type);
      return supabaseUser.user_metadata.user_type as 'dumper' | 'collector';
    }

    // Priority 2: Check app metadata
    if (supabaseUser.app_metadata?.user_type) {
      console.log('Found user type in app_metadata:', supabaseUser.app_metadata.user_type);
      return supabaseUser.app_metadata.user_type as 'dumper' | 'collector';
    }

    // Priority 3: Check localStorage
    const pendingType = getPendingUserType();
    if (pendingType === 'collector' || pendingType === 'dumper') {
      console.log('Found user type in localStorage:', pendingType);
      return pendingType as 'dumper' | 'collector';
    }

    // Priority 4: Check URL
    const urlType = extractUserTypeFromUrl();
    if (urlType === 'collector' || urlType === 'dumper') {
      console.log('Found user type in URL:', urlType);
      return urlType as 'dumper' | 'collector';
    }

    // Default fallback
    console.log('No user type found, defaulting to dumper');
    return 'dumper';
  }, [getPendingUserType, extractUserTypeFromUrl]);

  // PERFORMANCE: Memoized basic user creation with enhanced user type logic
  const createBasicUser = useCallback((userId: string, supabaseUser?: SupabaseUser): User => {
    const userType = supabaseUser ? determineUserType(supabaseUser) : 'dumper';
    
    console.log('Creating basic user with type:', userType);
    
    return {
      id: userId,
      email: supabaseUser?.email || session?.user?.email || '',
      fullName: supabaseUser ? getDisplayName(supabaseUser) : (session?.user ? getDisplayName(session.user) : null),
      userType: userType,
      phone: null,
      address: null,
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [session?.user, determineUserType, getDisplayName]);

  // PERFORMANCE: Optimized profile existence check with caching
  const ensureProfileExists = useCallback(async (supabaseUser?: SupabaseUser) => {
    if (!supabaseUser) return;

    const cacheKey = `profile_exists_${supabaseUser.id}`;
    const cached = getCachedData<boolean>(cacheKey);
    if (cached) return;

    try {
      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', supabaseUser.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const userType = determineUserType(supabaseUser);
        
        console.log('Creating new profile with user type:', userType);
        
        const profileData = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: getDisplayName(supabaseUser),
          user_type: userType,
          phone: supabaseUser.user_metadata?.phone || null,
          address: null,
          email_verified: true,
          phone_verified: false,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        console.log('Profile created successfully with user type:', userType);
      } else if (checkError) {
        throw new Error(`Profile check failed: ${checkError.message}`);
      } else if (data) {
        console.log('Existing profile found with user type:', data.user_type);
      }

      // Cache the result for 5 minutes
      setCachedData(cacheKey, true, 300000);
    } catch (error: unknown) {
      console.error('Error ensuring profile exists:', error);
      throw error;
    }
  }, [determineUserType, getDisplayName]);

  // PERFORMANCE: Optimized profile fetching with caching and timeout
  const fetchUserProfile = useCallback(async (userId: string, supabaseUser?: SupabaseUser) => {
    const cacheKey = `user_profile_${userId}`;
    const cached = getCachedData<User>(cacheKey);
    
    if (cached) {
      console.log('Using cached user profile:', cached);
      setUser(cached);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      // Shorter timeout for better UX
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000); // Reduced to 2 seconds
      });

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as PostgrestSingleResponse<Database['public']['Tables']['profiles']['Row']>;

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        const basicUser = createBasicUser(userId, supabaseUser);
        console.log('Using basic user fallback:', basicUser);
        setUser(basicUser);
        setCachedData(cacheKey, basicUser, 60000); // Cache for 1 minute
        setLoading(false);
        setInitialized(true);
        return;
      }

      if (data) {
        const userData = {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          userType: data.user_type,
          phone: data.phone,
          address: data.address,
          emailVerified: data.email_verified || true,
          phoneVerified: data.phone_verified || false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        
        console.log('Fetched user profile from database:', userData);
        setUser(userData);
        setCachedData(cacheKey, userData, 300000); // Cache for 5 minutes
        
        setVerification(prev => ({
          ...prev,
          emailVerified: userData.emailVerified,
          phoneVerified: userData.phoneVerified,
        }));
      } else {
        const basicUser = createBasicUser(userId, supabaseUser);
        console.log('No profile found, using basic user:', basicUser);
        setUser(basicUser);
        setCachedData(cacheKey, basicUser, 60000);
        
        try {
          await ensureProfileExists(supabaseUser);
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching user profile:', error);
      const fallbackUser = createBasicUser(userId, supabaseUser);
      console.log('Using fallback user:', fallbackUser);
      setUser(fallbackUser);
      setCachedData(cacheKey, fallbackUser, 60000);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [createBasicUser, ensureProfileExists]);

  // PERFORMANCE: Optimized initialization
  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        initializationTimeout = setTimeout(() => {
          if (mounted && !initialized) {
            setLoading(false);
            setInitialized(true);
          }
        }, 1500); // Reduced timeout

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (!mounted) return;

        // Clean up OAuth hash
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setSession(session);
        
        if (session?.user) {
          try {
            await ensureProfileExists(session.user);
            await fetchUserProfile(session.user.id, session.user);
          } catch (profileError) {
            console.error('Profile error:', profileError);
            setLoading(false);
            setInitialized(true);
          }
        } else {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
        }
      }
    };

    initializeAuth();

    // CRITICAL FIX: Enhanced auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setSession(session);
      
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          console.log('User signed in, ensuring profile exists');
          try {
            await ensureProfileExists(session.user);
            // Clear user type storage after successful profile creation
            setTimeout(() => {
              clearUserTypeStorage();
            }, 1000);
          } catch (error) {
            console.error('Error in sign-in process:', error);
          }
        }
        
        try {
          await fetchUserProfile(session.user.id, session.user);
        } catch (error) {
          console.error('Error fetching profile:', error);
          setLoading(false);
          setInitialized(true);
        }
      } else {
        setUser(null);
        clearCache(); // Clear cache on sign out
        clearUserTypeStorage(); // Clear user type storage
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => {
      mounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      subscription.unsubscribe();
    };
  }, [ensureProfileExists, fetchUserProfile, initialized, clearUserTypeStorage]);

  // CRITICAL FIX: Enhanced sign in function with better state management
  const signInWithGoogle = useCallback(async (userType: 'dumper' | 'collector') => {
    setLoading(true);
    
    try {
      console.log('Starting Google sign-in for user type:', userType);
      
      // Store user type in multiple places for reliability
      storeUserTypeForOAuth(userType);
      
      const stateData = {
        user_type: userType,
        timestamp: Date.now(),
        source: 'google_oauth'
      };
      
      const encodedState = btoa(JSON.stringify(stateData));
      console.log('OAuth state data:', stateData);
      console.log('Encoded state:', encodedState);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          state: encodedState,
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        setLoading(false);
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  }, [storeUserTypeForOAuth, redirectUrl]);

  // CRITICAL FIX: Improved sign out function to handle redirect properly
  const signOut = useCallback(async () => {
    try {
      console.log('Starting sign out process...');
      
      // Clear cache and local storage first
      clearCache();
      clearUserTypeStorage();
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token');
          // Clear any Supabase auth tokens
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('sb-') && key.includes('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        // Don't throw error, continue with local cleanup
      }
      
      // Reset verification state
      setVerification({
        emailSent: false,
        phoneSent: false,
        emailVerified: false,
        phoneVerified: false,
        isVerifying: false,
        error: null,
      });

      // Reset user and session state
      setUser(null);
      setSession(null);
      setInitialized(false);
      
      console.log('Sign out completed, redirecting...');
      
      // CRITICAL FIX: Use window.location.replace instead of href to avoid navigation issues
      // This prevents the DNS error by ensuring a clean page reload
      if (typeof window !== 'undefined') {
        // Force a complete page reload to the root path
        window.location.replace('/');
      }
      
    } catch (error) {
      console.error('Error during sign out:', error);
      
      // Even if sign out fails, force a page reload to clear the session
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  }, [clearUserTypeStorage]);

  // CRITICAL FIX: Enhanced profile update function with immediate state update
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('AuthContext: Starting profile update with:', updates);
      
      // Clear cache for this user immediately
      clearCache(`user_profile_${user.id}`);
      clearCache(`profile_exists_${user.id}`);
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Create new profile
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: updates.fullName || user.fullName,
          user_type: updates.userType || user.userType,
          phone: updates.phone || user.phone,
          address: updates.address || user.address,
          email_verified: user.emailVerified,
          phone_verified: user.phoneVerified,
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }
        
        console.log('AuthContext: Created new profile:', newProfile);
      } else if (checkError) {
        throw new Error(`Profile check failed: ${checkError.message}`);
      } else {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: updates.fullName,
            user_type: updates.userType,
            phone: updates.phone,
            address: updates.address,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }
        
        console.log('AuthContext: Updated existing profile:', updatedProfile);
      }

      // CRITICAL FIX: Update local user state immediately and force re-render
      const updatedUser = { 
        ...user, 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      
      console.log('AuthContext: Setting updated user state:', updatedUser);
      setUser(updatedUser);

      // Cache the updated user data with a shorter TTL to ensure freshness
      setCachedData(`user_profile_${user.id}`, updatedUser, 60000); // 1 minute cache

      console.log('AuthContext: Profile update completed successfully');

    } catch (error: unknown) {
      console.error('AuthContext: Error updating profile:', error);
      throw error;
    }
  }, [user]);

  // PERFORMANCE: Optimized verification functions
  const resendEmailVerification = useCallback(async () => {
    if (!session?.user?.email) return;

    setVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });

      if (error) throw error;

      setVerification(prev => ({
        ...prev,
        emailSent: true,
        isVerifying: false,
      }));
    } catch (error: unknown) {
      console.error('Error resending email verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend email verification';
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [session?.user?.email]);

  const sendPhoneVerification = useCallback(async (phone: string) => {
    setVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { phone },
      });

      if (error) throw error;

      setVerification(prev => ({
        ...prev,
        phoneSent: true,
        isVerifying: false,
      }));
    } catch (error: unknown) {
      console.error('Error sending phone verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send phone verification';
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const verifyPhoneCode = useCallback(async (code: string) => {
    if (!user) return;

    setVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const { error } = await supabase.functions.invoke('verify-phone', {
        body: { code },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const updatedUser = { ...user, phoneVerified: true };
      setUser(updatedUser);
      
      // Update cache
      setCachedData(`user_profile_${user.id}`, updatedUser, 300000);
      
      setVerification(prev => ({
        ...prev,
        phoneVerified: true,
        isVerifying: false,
      }));
    } catch (error: unknown) {
      console.error('Error verifying phone code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify phone code';
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [user]);

  // PERFORMANCE: Memoize context value
  const value = useMemo(() => ({
    user,
    session,
    loading: loading && !initialized,
    verification,
    signInWithGoogle,
    signOut,
    updateProfile,
    resendEmailVerification,
    sendPhoneVerification,
    verifyPhoneCode,
  }), [
    user,
    session,
    loading,
    initialized,
    verification,
    signInWithGoogle,
    signOut,
    updateProfile,
    resendEmailVerification,
    sendPhoneVerification,
    verifyPhoneCode,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};