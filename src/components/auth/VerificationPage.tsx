import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, AlertCircle, RefreshCw, MessageSquare, User, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const VerificationPage: React.FC = () => {
  const { user, verification, sendPhoneVerification, verifyPhoneCode, updateProfile } = useAuth();
  const [phoneCode, setPhoneCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    userType: user?.userType || 'dumper' as 'dumper' | 'collector',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check if user needs to complete profile setup
  useEffect(() => {
    if (user && (!user.fullName || !user.userType)) {
      setShowProfileSetup(true);
    }
  }, [user]);

  const handleResendPhone = async () => {
    if (profileData.phone) {
      await sendPhoneVerification(profileData.phone);
      setCountdown(60);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneCode.length === 6) {
      await verifyPhoneCode(phoneCode);
      if (verification.phoneVerified) {
        setPhoneCode('');
      }
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      setShowProfileSetup(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const isFullyVerified = verification.emailVerified && (!profileData.phone || verification.phoneVerified);

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-600 mt-2">
              Let's set up your account to get started
            </p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to *
              </label>
              <select
                value={profileData.userType}
                onChange={(e) => setProfileData({ ...profileData, userType: e.target.value as 'dumper' | 'collector' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="dumper">Request waste collection services</option>
                <option value="collector">Provide waste collection services</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Include country code. Phone verification will be required if provided.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your address"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className={`p-3 rounded-full ${isFullyVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
            {isFullyVerified ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFullyVerified ? 'Account Verified!' : 'Verify Your Phone'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isFullyVerified 
              ? 'Your account is fully verified and ready to use.'
              : 'Please verify your phone number to continue.'
            }
          </p>
        </div>

        {verification.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{verification.error}</p>
            </div>
          </div>
        )}

        {/* Phone Verification */}
        {profileData.phone && !isFullyVerified && (
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <span className="font-medium text-gray-900">Phone Verification</span>
              </div>
              {verification.phoneVerified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {profileData.phone}
            </p>

            {verification.phoneVerified ? (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Phone verified successfully
              </div>
            ) : (
              <div>
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
            )}
          </div>
        )}

        {isFullyVerified && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">Account ready!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              You can now access all features of the platform.
            </p>
          </div>
        )}

        {!isFullyVerified && profileData.phone && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-yellow-800 font-medium">Phone Verification Required</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Please verify your phone number to access all features.
            </p>
          </div>
        )}

        {/* SMS Service Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-xs">
            📱 SMS messages are sent via secure delivery. Standard messaging rates may apply.
          </p>
        </div>
      </div>
    </div>
  );
};