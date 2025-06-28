import React, { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User as SupabaseUser, Session, PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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

  // Get the correct redirect URL - always use custom domain
  const getRedirectUrl = () => {
    return 'https://scrubbed.online';
  };

  // Extract user type from URL parameters after OAuth redirect
  const extractUserTypeFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Check URL hash for access_token and state
      const hash = window.location.hash;
      if (hash.includes('access_token') && hash.includes('state=')) {
        const stateMatch = hash.match(/state=([^&]+)/);
        if (stateMatch) {
          const decodedState = decodeURIComponent(stateMatch[1]);
          const stateData = JSON.parse(atob(decodedState));
          console.log('Extracted OAuth state data:', stateData);
          return stateData.user_type || null;
        }
      }
      
      // Check URL search params as fallback
      const urlParams = new URLSearchParams(window.location.search);
      const state = urlParams.get('state');
      if (state) {
        const stateData = JSON.parse(atob(state));
        console.log('Extracted state data from search params:', stateData);
        return stateData.user_type || null;
      }
    } catch (error) {
      console.warn('Failed to extract user type from URL:', error);
    }
    
    return null;
  };

  // Store user type in localStorage temporarily during OAuth flow
  const storeUserTypeForOAuth = (userType: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_user_type', userType);
      console.log('Stored pending user type:', userType);
    }
  };

  const getPendingUserType = (): string | null => {
    if (typeof window !== 'undefined') {
      const pendingType = localStorage.getItem('pending_user_type');
      if (pendingType) {
        localStorage.removeItem('pending_user_type'); // Clean up after use
        console.log('Retrieved pending user type:', pendingType);
        return pendingType;
      }
    }
    return null;
  };

  // Send welcome email function
  const sendWelcomeEmail = async (userEmail: string, userName: string, userType: 'dumper' | 'collector') => {
    try {
      const emailContent = {
        to: userEmail,
        subject: 'Welcome to Scrubbed - Your Google Account is Connected!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin: 0;">Welcome to Scrubbed!</h1>
              <p style="color: #6b7280; margin: 10px 0;">Smart Waste Management Made Simple</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #374151; margin-top: 0;">Hi ${userName}!</h2>
              <p style="color: #6b7280; line-height: 1.6;">
                Your Google account has been successfully connected to <strong>scrubbed.online</strong>. 
                You're now ready to ${userType === 'dumper' ? 'request waste collection services' : 'start earning money as a waste collector'}!
              </p>
            </div>

            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151;">What's next?</h3>
              <ul style="color: #6b7280; line-height: 1.6;">
                ${userType === 'dumper' ? `
                  <li>Create your first waste collection request</li>
                  <li>Get matched with professional collectors in your area</li>
                  <li>Track your collections in real-time</li>
                  <li>Rate and review your collectors</li>
                ` : `
                  <li>Complete your collector profile setup</li>
                  <li>Browse available collection requests</li>
                  <li>Start accepting jobs and earning money</li>
                  <li>Build your reputation with customer ratings</li>
                `}
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://scrubbed.online" 
                 style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Get Started Now
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
              <p>This email was sent because you connected your Google account to Scrubbed.</p>
              <p>If you didn't create this account, please ignore this email.</p>
              <p>&copy; 2025 Scrubbed. All rights reserved.</p>
            </div>
          </div>
        `
      };

      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: emailContent
        });
        console.log('Welcome email sent successfully');
      } catch {
        console.log('Welcome email service not configured, skipping email send');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  // Helper function to get display name from Google user data
  const getDisplayName = (supabaseUser: SupabaseUser): string => {
    if (supabaseUser.user_metadata?.full_name) {
      return supabaseUser.user_metadata.full_name;
    }
    
    if (supabaseUser.user_metadata?.name) {
      return supabaseUser.user_metadata.name;
    }
    
    const firstName = supabaseUser.user_metadata?.given_name || supabaseUser.user_metadata?.first_name;
    const lastName = supabaseUser.user_metadata?.family_name || supabaseUser.user_metadata?.last_name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    if (firstName) {
      return firstName;
    }
    
    if (supabaseUser.email) {
      const emailUsername = supabaseUser.email.split('@')[0];
      return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    }
    
    return 'User';
  };

  const createBasicUser = useCallback((userId: string): User => {
    // CRITICAL FIX: Get user type from multiple sources
    let userType: 'dumper' | 'collector' = 'dumper'; // Default fallback
    
    // 1. Check session user metadata
    if (session?.user?.user_metadata?.user_type) {
      userType = session.user.user_metadata.user_type;
      console.log('User type from session metadata:', userType);
    }
    // 2. Check for pending user type from OAuth flow
    else {
      const pendingType = getPendingUserType();
      if (pendingType === 'collector' || pendingType === 'dumper') {
        userType = pendingType as 'dumper' | 'collector';
        console.log('User type from pending OAuth:', userType);
      }
      // 3. Try to extract from URL
      else {
        const urlType = extractUserTypeFromUrl();
        if (urlType === 'collector' || urlType === 'dumper') {
          userType = urlType as 'dumper' | 'collector';
          console.log('User type from URL:', urlType);
        }
      }
    }
    
    console.log('Final determined user type:', userType);
    
    return {
      id: userId,
      email: session?.user?.email || '',
      fullName: getDisplayName(session?.user || {} as SupabaseUser) || null,
      userType: userType,
      phone: null,
      address: null,
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [session?.user]);

  const ensureProfileExists = useCallback(async (supabaseUser?: SupabaseUser) => {
    if (!supabaseUser) return;

    try {
      console.log('Ensuring profile exists for:', supabaseUser.id);
      console.log('User metadata:', supabaseUser.user_metadata);
      
      const { _data, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', supabaseUser.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating new profile');
        
        // CRITICAL FIX: Get user type from multiple sources with proper priority
        let userType: 'dumper' | 'collector' = 'dumper'; // Default fallback
        
        // Priority 1: Check user metadata
        if (supabaseUser.user_metadata?.user_type) {
          userType = supabaseUser.user_metadata.user_type;
          console.log('User type from metadata:', userType);
        }
        // Priority 2: Check app metadata
        else if (supabaseUser.app_metadata?.user_type) {
          userType = supabaseUser.app_metadata.user_type;
          console.log('User type from app metadata:', userType);
        }
        // Priority 3: Check pending OAuth type
        else {
          const pendingType = getPendingUserType();
          if (pendingType === 'collector' || pendingType === 'dumper') {
            userType = pendingType as 'dumper' | 'collector';
            console.log('User type from pending OAuth:', userType);
          }
          // Priority 4: Extract from URL
          else {
            const urlType = extractUserTypeFromUrl();
            if (urlType === 'collector' || urlType === 'dumper') {
              userType = urlType as 'dumper' | 'collector';
              console.log('User type from URL:', urlType);
            }
          }
        }
        
        console.log('Final determined user type for profile creation:', userType);
        
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

        console.log('Creating profile with data:', profileData);

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw new Error(`Failed to create profile: ${profileError.message}`);
        } else {
          console.log('Profile created successfully:', newProfile);
        }
      } else if (checkError) {
        console.error('Error checking profile:', checkError);
        throw new Error(`Profile check failed: ${checkError.message}`);
      } else {
        console.log('Profile already exists');
      }
    } catch (error: unknown) {
      console.error('Error ensuring profile exists:', error);
      throw error;
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Use a shorter timeout for profile fetching
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000); // Reduced to 3 seconds
      });

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as PostgrestSingleResponse<Database['public']['Tables']['profiles']['Row']>;

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        // Create a basic user object to prevent infinite loading
        const basicUser = createBasicUser(userId);
        setUser(basicUser);
        setLoading(false);
        setInitialized(true);
        return;
      }

      if (data) {
        console.log('Profile data found:', data);
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
        
        console.log('Setting user data:', userData);
        setUser(userData);
        
        // Update verification state based on user data
        setVerification(prev => ({
          ...prev,
          emailVerified: userData.emailVerified,
          phoneVerified: userData.phoneVerified,
        }));
      } else {
        console.log('No profile found, creating basic user object');
        const basicUser = createBasicUser(userId);
        setUser(basicUser);
        
        try {
          await ensureProfileExists(session?.user);
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching user profile:', error);
      // Fallback user object
      const fallbackUser = createBasicUser(userId);
      setUser(fallbackUser);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [session?.user, createBasicUser, ensureProfileExists]);

  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth without session persistence...');
        
        // Set a shorter timeout to prevent long loading states
        initializationTimeout = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('Auth initialization timeout, setting loading to false');
            setLoading(false);
            setInitialized(true);
          }
        }, 2000); // Reduced to 2 seconds since we're not using persistence

        // Clear any existing localStorage data that might cause issues
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('supabase.auth.token');
            const supabaseKey = 'sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token';
            localStorage.removeItem(supabaseKey);
          } catch (e) {
            console.warn('Failed to clear localStorage:', e);
          }
        }

        // Get the current session (no localStorage fallback since persistence is disabled)
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

        // Clean up OAuth hash from URL if present
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Cleaning up OAuth hash from URL');
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setSession(session);
        
        if (session?.user) {
          console.log('Found authenticated user:', session.user.id);
          try {
            await ensureProfileExists(session.user);
            await fetchUserProfile(session.user.id);
          } catch (profileError) {
            console.error('Profile error:', profileError);
            // Don't block the app if profile creation fails
            setLoading(false);
            setInitialized(true);
          }
        } else {
          console.log('No authenticated user found');
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

    // Listen for auth changes with optimized handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);
      
      // Clear any existing timeout
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      
      // Clean up URL hash on any auth state change
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('Cleaning up OAuth hash after auth state change');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setSession(session);
      
      if (session?.user) {
        // Create profile if it doesn't exist (for new Google users)
        if (event === 'SIGNED_IN') {
          console.log('User signed in, ensuring profile exists');
          try {
            await ensureProfileExists(session.user);
            
            // Get user type and send welcome email for new sign-ins
            const userType = session.user.user_metadata?.user_type || 'dumper';
            const userName = getDisplayName(session.user);
            
            if (session.user.email) {
              await sendWelcomeEmail(session.user.email, userName, userType);
            }
          } catch (error) {
            console.error('Error in sign-in process:', error);
          }
        }
        
        try {
          await fetchUserProfile(session.user.id);
        } catch (error) {
          console.error('Error fetching profile:', error);
          setLoading(false);
          setInitialized(true);
        }
      } else {
        setUser(null);
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
  }, [ensureProfileExists, fetchUserProfile, initialized]);

  const signInWithGoogle = async (userType: 'dumper' | 'collector') => {
    setLoading(true);
    
    try {
      const redirectTo = getRedirectUrl();
      
      console.log('Starting Google sign-in for:', userType, 'redirectTo:', redirectTo);
      
      // Store user type for OAuth flow
      storeUserTypeForOAuth(userType);
      
      // CRITICAL FIX: Use state parameter to pass user type through OAuth
      const stateData = {
        user_type: userType,
        timestamp: Date.now()
      };
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Pass user type in the state parameter for OAuth
          state: btoa(JSON.stringify(stateData)),
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        setLoading(false);
        throw error;
      }
      
      // Don't set loading to false here - let the auth state change handle it
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Clear any localStorage data to prevent stale session issues
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('pending_user_type'); // Clean up OAuth state
          const supabaseKey = 'sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token';
          localStorage.removeItem(supabaseKey);
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
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
      
      // Redirect to the custom domain
      const redirectUrl = getRedirectUrl();
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      console.log('Updating profile with:', updates);
      
      const { _data, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating profile during update');
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: updates.fullName || user.fullName,
            user_type: updates.userType || user.userType,
            phone: updates.phone || user.phone,
            address: updates.address || user.address,
            email_verified: user.emailVerified,
            phone_verified: user.phoneVerified,
          });

        if (createError) {
          console.error('Error creating profile during update:', createError);
          throw createError;
        }
      } else if (checkError) {
        throw checkError;
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updates.fullName,
            user_type: updates.userType,
            phone: updates.phone,
            address: updates.address,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      const updatedUser = { ...user, ...updates };
      console.log('Updated user state:', updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const resendEmailVerification = async () => {
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
  };

  const sendPhoneVerification = async (phone: string) => {
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
  };

  const verifyPhoneCode = async (code: string) => {
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

      setUser(prev => prev ? { ...prev, phoneVerified: true } : null);
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
  };

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};