import React, { useState } from 'react';
import { Chrome, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface GoogleSignInButtonProps {
  userType: 'dumper' | 'collector';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ userType }) => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(userType);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      // Error handling is done in the context
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-3" />
      ) : (
        <Chrome className="h-5 w-5 mr-3 text-blue-500" />
      )}
      {loading ? 'Signing in...' : `Continue with Google as ${userType === 'dumper' ? 'Customer' : 'Collector'}`}
    </button>
  );
};