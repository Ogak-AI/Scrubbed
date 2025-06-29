import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const VerificationPage: React.FC = () => {
  const { user, verification, sendPhoneVerification, verifyPhoneCode } = useAuth();
  const [phoneCode, setPhoneCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendPhone = async () => {
    if (user?.phone) {
      try {
        await sendPhoneVerification(user.phone);
        setCountdown(60);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
        setError(errorMessage);
      }
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneCode.length === 6) {
      try {
        await verifyPhoneCode(phoneCode);
        if (verification.phoneVerified) {
          setPhoneCode('');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
        setError(errorMessage);
      }
    }
  };

  // Check if verification is complete
  const isVerificationComplete = verification.phoneVerified;

  if (isVerificationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Phone Verified!</h1>
          <p className="text-gray-600 mb-4">
            Your phone number has been successfully verified. Redirecting to your dashboard...
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="p-3 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Phone className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Phone</h1>
          <p className="text-gray-600 mt-2">
            Please verify your phone number to complete your account setup.
          </p>
        </div>

        {/* Error Display */}
        {(verification.error || error) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{verification.error || error}</p>
            </div>
          </div>
        )}

        {/* Phone Verification */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900">Phone Number</span>
            </div>
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {user?.phone}
          </p>

          {verification.phoneSent ? (
            <form onSubmit={handleVerifyPhone} className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-700 text-sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span>SMS sent! Enter the 6-digit code below:</span>
                </div>
              </div>
              <input
                type="text"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={phoneCode.length !== 6 || verification.isVerifying}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {verification.isVerifying ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    'Verify Code'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResendPhone}
                  disabled={verification.isVerifying || countdown > 0}
                  className="px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {countdown > 0 ? `${countdown}s` : 'Resend'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleResendPhone}
              disabled={verification.isVerifying}
              className="flex items-center text-sm text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className={`h-4 w-4 mr-1 ${verification.isVerifying ? 'animate-pulse' : ''}`} />
              {verification.isVerifying ? 'Sending SMS...' : 'Send verification code'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-800 font-medium">Phone Verification Required</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Please verify your phone number to access all platform features.
          </p>
        </div>

        {/* SMS Service Notice */}
        <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-xs">
            📱 SMS messages are sent via secure delivery. Standard messaging rates may apply.
          </p>
        </div>
      </div>
    </div>
  );
};