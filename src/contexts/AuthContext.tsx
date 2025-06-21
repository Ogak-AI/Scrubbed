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

  // Get the correct redirect URL - always use custom domain
  const getRedirectUrl = () => {
    return 'https://scrubbed.online';
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
      } catch (emailError) {
        console.log('Welcome email service not configured, skipping email send');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // First, check if we have a session from URL hash (OAuth callback)
        const { data: { session: hashSession }, error: hashError } = await supabase.auth.getSession();
        
        if (hashError) {
          console.error('Error getting session from hash:', hashError);
        }
        
        // If we have a session from the hash, use it
        if (hashSession?.user) {
          console.log('Found session from OAuth callback:', hashSession.user.id);
          
          // Clean up the URL hash
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          
          setSession(hashSession);
          
          // Ensure profile exists and fetch user data
          await ensureProfileExists(hashSession.user);
          await fetchUserProfile(hashSession.user.id);
          return;
        }
        
        // No session from hash, check for existing session
        console.log('No OAuth callback session, checking for existing session...');
        setLoading(false);
        
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
      
      // Clean up URL hash on any auth state change
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setSession(session);
      
      if (session?.user) {
        // Create profile if it doesn't exist (for new Google users)
        if (event === 'SIGNED_IN') {
          await ensureProfileExists(session.user);
          
          // Send welcome email for new sign-ins
          const userType = session.user.user_metadata?.user_type || 'dumper';
          const userName = getDisplayName(session.user);
          
          if (session.user.email) {
            await sendWelcomeEmail(session.user.email, userName, userType);
          }
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

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        // Create a basic user object to prevent infinite loading
        const basicUser = {
          id: userId,
          email: session?.user?.email || '',
          fullName: getDisplayName(session?.user!) || null,
          userType: 'dumper' as const,
          phone: null,
          address: null,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(basicUser);
        setLoading(false);
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
        const basicUser = {
          id: userId,
          email: session?.user?.email || '',
          fullName: getDisplayName(session?.user!) || null,
          userType: 'dumper' as const,
          phone: null,
          address: null,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUser(basicUser);
        
        try {
          await ensureProfileExists(session?.user);
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // Fallback user object
      const fallbackUser = {
        id: userId,
        email: session?.user?.email || '',
        fullName: getDisplayName(session?.user!) || null,
        userType: 'dumper' as const,
        phone: null,
        address: null,
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (supabaseUser?: SupabaseUser) => {
    if (!supabaseUser) return;

    try {
      console.log('Ensuring profile exists for:', supabaseUser.id);
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', supabaseUser.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating new profile');
        const userType = supabaseUser.user_metadata?.user_type || 'dumper';
        
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
    } catch (error: any) {
      console.error('Error ensuring profile exists:', error);
      throw error;
    }
  };

  const signInWithGoogle = async (userType: 'dumper' | 'collector') => {
    setLoading(true);
    
    try {
      const redirectTo = getRedirectUrl();
      
      console.log('Starting Google sign-in for:', userType, 'redirectTo:', redirectTo);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
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
      console.log('Signing out...');
      
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
      
      const { data: existingProfile, error: checkError } = await supabase
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
      const { data, error } = await supabase.functions.invoke('verify-phone', {
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