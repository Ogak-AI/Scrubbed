import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSettingsProps {
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    // Remove userType from formData since it shouldn't be editable
  });

  // Parse first and last name from full name
  const getFirstName = () => {
    if (!formData.fullName) return '';
    return formData.fullName.trim().split(' ')[0] || '';
  };

  const getLastName = () => {
    if (!formData.fullName) return '';
    const parts = formData.fullName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  };

  const setFirstName = (firstName: string) => {
    const lastName = getLastName();
    setFormData(prev => ({
      ...prev,
      fullName: lastName ? `${firstName} ${lastName}` : firstName
    }));
  };

  const setLastName = (lastName: string) => {
    const firstName = getFirstName();
    setFormData(prev => ({
      ...prev,
      fullName: firstName ? `${firstName} ${lastName}` : lastName
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Only update the fields that are editable (exclude userType)
      await updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
      });
      setSuccess(true);
      
      // Close after showing success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  // Helper function to get display name for account type
  const getAccountTypeDisplay = () => {
    switch (user?.userType) {
      case 'dumper':
        return 'Customer Account';
      case 'collector':
        return 'Collector Account';
      case 'admin':
        return 'Administrator Account';
      default:
        return 'Unknown Account Type';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-3 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-600">Manage your account information</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setShowPersonalInfo(true)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    showPersonalInfo 
                      ? 'bg-green-100 text-green-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Personal Info
                </button>
                <button
                  onClick={() => setShowPersonalInfo(false)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    !showPersonalInfo 
                      ? 'bg-green-100 text-green-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  Privacy
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showPersonalInfo ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                    <p className="text-sm text-gray-600 mt-1">Update your personal details and preferences</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <p className="text-green-700 text-sm">Profile updated successfully!</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={getFirstName()}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={getLastName()}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Email cannot be changed as it's linked to your Google account
                    </p>
                  </div>

                  {/* Account Type - Display Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={getAccountTypeDisplay()}
                        disabled
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Account type is determined when you sign up and cannot be changed
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Include country code. Phone verification will be required if changed.
                    </p>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your address"
                      />
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Account Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Account Created:</span>
                        <p className="font-medium text-gray-900">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Email Verified:</span>
                        <p className={`font-medium ${user?.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {user?.emailVerified ? 'Verified' : 'Not Verified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone Verified:</span>
                        <p className={`font-medium ${user?.phoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {user?.phoneVerified ? 'Verified' : 'Not Verified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Account Type:</span>
                        <p className="font-medium text-gray-900">
                          {getAccountTypeDisplay()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Privacy Settings */
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage your privacy and data preferences</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Eye className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Google Account Integration</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      Your account is connected to Google. This provides secure authentication and access to your basic profile information.
                    </p>
                    <div className="text-blue-700 text-sm space-y-1">
                      <p>• <strong>Name:</strong> Used for personalization and communication</p>
                      <p>• <strong>Email:</strong> Used for account identification and notifications</p>
                      <p>• <strong>Profile Picture:</strong> Used for account display (if available)</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Data Usage</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-gray-900">Location Data</p>
                          <p>Used only for matching you with nearby collectors. Not stored permanently.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-gray-900">Contact Information</p>
                          <p>Used for communication between users and service notifications.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-gray-900">Usage Analytics</p>
                          <p>Anonymous data to improve our service quality and user experience.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-2">Account Deletion</h3>
                    <p className="text-yellow-700 text-sm mb-3">
                      If you wish to delete your account and all associated data, please contact our support team.
                    </p>
                    <button className="text-yellow-700 hover:text-yellow-800 font-medium text-sm underline">
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};