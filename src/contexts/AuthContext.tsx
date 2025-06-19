import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User, VerificationState } from '../types';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationState>({
    emailSent: false,
    phoneSent: false,
    emailVerified: false,
    phoneVerified: false,
    isVerifying: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        // Create profile if it doesn't exist (for new Google users)
        if (event === 'SIGNED_IN') {
          await ensureProfileExists(session.user);
        }
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Add timeout to profile fetch
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Profile data:', data);
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
        // User exists but no profile - create a basic user object
        const basicUser = {
          id: userId,
          email: session?.user?.email || '',
          fullName: session?.user?.user_metadata?.full_name || null,
          userType: 'dumper' as const, // Default, will be updated during onboarding
          phone: null,
          address: null,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUser(basicUser);
        
        // Try to create the profile in the database
        try {
          await ensureProfileExists(session?.user);
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
          // Don't block the user, they can still use the app
        }
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // Don't leave user in loading state indefinitely
      if (error.message === 'Profile fetch timeout') {
        // Set a basic user object to prevent infinite loading
        setUser({
          id: userId,
          email: session?.user?.email || '',
          fullName: session?.user?.user_metadata?.full_name || null,
          userType: 'dumper',
          phone: null,
          address: null,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (supabaseUser?: SupabaseUser) => {
    if (!supabaseUser) return;

    try {
      console.log('Ensuring profile exists for:', supabaseUser.id);
      
      // Add timeout to profile check
      const checkPromise = supabase
        .from('profiles')
        .select('id')
        .eq('id', supabaseUser.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile check timeout')), 2000)
      );

      const { data: existingProfile, error: checkError } = await Promise.race([
        checkPromise,
        timeoutPromise
      ]) as any;

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating new profile');
        // Get user type from session metadata (set during sign-in)
        const userType = supabaseUser.user_metadata?.user_type || 'dumper';
        
        const profileData = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          user_type: userType,
          phone: supabaseUser.user_metadata?.phone || null,
          address: null,
          email_verified: true, // Google users are automatically verified
          phone_verified: false,
        };

        console.log('Creating profile with data:', profileData);

        // Create new profile for Google user with timeout
        const createPromise = supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        const createTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile creation timeout')), 3000)
        );

        const { data: newProfile, error: profileError } = await Promise.race([
          createPromise,
          createTimeoutPromise
        ]) as any;

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
    } catch (error: any) {
      console.error('Error ensuring profile exists:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  const signInWithGoogle = async (userType: 'dumper' | 'collector') => {
    setLoading(true);
    
    try {
      // Get the current URL for redirect
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      
      console.log('Starting Google sign-in for:', userType, 'redirectTo:', redirectTo);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Store user type in metadata to use during profile creation
          data: {
            user_type: userType,
          },
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Reset verification state on sign out
      setVerification({
        emailSent: false,
        phoneSent: false,
        emailVerified: false,
        phoneVerified: false,
        isVerifying: false,
        error: null,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      console.log('Updating profile with:', updates);
      
      // First, ensure the profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it first
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
        // Profile exists, update it
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

      // Update local user state
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
    } catch (error: any) {
      console.error('Error resending email verification:', error);
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const sendPhoneVerification = async (phone: string) => {
    setVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      // Call edge function to send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone },
      });

      if (error) throw error;

      setVerification(prev => ({
        ...prev,
        phoneSent: true,
        isVerifying: false,
      }));
    } catch (error: any) {
      console.error('Error sending phone verification:', error);
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const verifyPhoneCode = async (code: string) => {
    if (!user) return;

    setVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      // Call edge function to verify phone code
      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: { code },
      });

      if (error) throw error;

      // Update user profile to mark phone as verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, phoneVerified: true } : null);
      setVerification(prev => ({
        ...prev,
        phoneVerified: true,
        isVerifying: false,
      }));
    } catch (error: any) {
      console.error('Error verifying phone code:', error);
      setVerification(prev => ({
        ...prev,
        isVerifying: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
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