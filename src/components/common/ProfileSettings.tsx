import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, AlertCircle, CheckCircle, Eye, Trash2, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getCountriesWithPopularFirst } from '../../utils/countries';

interface ProfileSettingsProps {
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
  const { user, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  
  const countries = getCountriesWithPopularFirst();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: (() => {
      try {
        if (user?.address) {
          const parsed = JSON.parse(user.address);
          if (typeof parsed === 'object') {
            return {
              street: parsed.street || '',
              city: parsed.city || '',
              state: parsed.state || '',
              zipCode: parsed.zipCode || '',
              country: parsed.country || 'United States',
            };
          }
        }
      } catch {
        // If parsing fails, treat as plain text
      }
      return {
        street: user?.address || '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      };
    })(),
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
    // Clear any existing errors when user makes changes
    clearFieldError('fullName');
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const setLastName = (lastName: string) => {
    const firstName = getFirstName();
    setFormData(prev => ({
      ...prev,
      fullName: firstName ? `${firstName} ${lastName}` : lastName
    }));
    // Clear any existing errors when user makes changes
    clearFieldError('fullName');
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const formatAddress = (address: typeof formData.address) => {
    return JSON.stringify({
      street: address.street.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zipCode: address.zipCode.trim(),
      country: address.country.trim(),
    });
  };

  // Clear specific field error
  const clearFieldError = (fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // CRITICAL CHANGE: Simplified form validation - NO phone verification required
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter your full name';
    }
    
    if (!formData.address.street.trim()) {
      errors.street = 'Please enter your street address';
    }
    
    if (!formData.address.city.trim()) {
      errors.city = 'Please enter your city';
    }
    
    if (!formData.address.state.trim()) {
      errors.state = 'Please enter your state';
    }
    
    if (!formData.address.zipCode.trim()) {
      errors.zipCode = 'Please enter your ZIP code';
    }

    // REMOVED: Phone validation completely - phone is now just a simple optional field
    // No format validation, no verification requirements

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form has changes (including when phone is removed)
  const hasChanges = () => {
    const currentAddress = formatAddress(formData.address);
    const originalAddress = user?.address || '';
    
    // Normalize phone values for comparison (treat empty string and null as same)
    const currentPhone = formData.phone.trim() || null;
    const originalPhone = user?.phone || null;
    
    return (
      formData.fullName.trim() !== (user?.fullName || '') ||
      currentPhone !== originalPhone ||
      currentAddress !== originalAddress
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('ProfileSettings: Form submission started');
    console.log('ProfileSettings: Current form data:', formData);
    console.log('ProfileSettings: Current user data:', user);
    
    // Validate form before submission
    if (!validateForm()) {
      const errorFields = Object.keys(fieldErrors);
      const errorMessage = `Please fix the following fields: ${errorFields.join(', ')}`;
      console.log('ProfileSettings: Validation failed:', errorMessage);
      setError(errorMessage);
      return;
    }

    // Check if there are actually changes to save
    if (!hasChanges()) {
      console.log('ProfileSettings: No changes detected');
      setError('No changes detected. Please modify your information before saving.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    try {
      const updateData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || null, // Convert empty string to null
        address: formatAddress(formData.address),
      };

      console.log('ProfileSettings: Calling updateProfile with:', updateData);

      await updateProfile(updateData);

      console.log('ProfileSettings: Profile updated successfully');
      setSuccess(true);
      setError(null);
      setFieldErrors({});
      
      // Show success message for 3 seconds, then close
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (err: unknown) {
      console.error('ProfileSettings: Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear any existing errors when user makes changes
    clearFieldError(field);
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
    // Clear any existing errors when user makes changes
    clearFieldError(field);
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      alert('Account deletion is not yet implemented. Please contact support to delete your account.');
      await signOut();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
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

  // Helper function to format address for display
  const getFormattedAddress = () => {
    if (!user?.address) return 'No address provided';
    
    try {
      const parsed = JSON.parse(user.address);
      if (typeof parsed === 'object') {
        const parts = [];
        if (parsed.street) parts.push(parsed.street);
        if (parsed.city) parts.push(parsed.city);
        if (parsed.state) parts.push(parsed.state);
        if (parsed.zipCode) parts.push(parsed.zipCode);
        if (parsed.country && parsed.country !== 'United States') parts.push(parsed.country);
        return parts.join(', ') || 'Address incomplete';
      }
    } catch {
      // If parsing fails, return the raw address
      return user.address;
    }
    
    return 'Address incomplete';
  };

  const dismissError = () => {
    setError(null);
  };

  // Helper function to get field error styling
  const getFieldErrorClass = (fieldName: string) => {
    return fieldErrors[fieldName] ? 'border-red-300 bg-red-50' : 'border-gray-300';
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
                  Privacy & Security
                </button>
              </nav>
            </div>

            {/* Profile Preview Card */}
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Profile Preview
              </h3>
              
              <div className="space-y-3 text-xs">
                {/* User Avatar & Name */}
                <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {user?.fullName || 'Name not set'}
                    </p>
                    <p className="text-gray-500 truncate">{getAccountTypeDisplay()}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Mail className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-600 break-all">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Phone className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-600">
                        {user?.phone || 'No phone number'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-600 break-words">
                        {getFormattedAddress()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Status - REMOVED phone verification status */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email Status:</span>
                    <div className="flex items-center">
                      {user?.emailVerified ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-green-600 font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                          <span className="text-red-600 font-medium">Unverified</span>
                        </>
                      )}
                    </div>
                  </div>

                  {user?.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Member Since:</span>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-gray-600 font-medium">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-green-700 text-sm font-medium">Profile updated successfully! Changes have been applied and will persist after sign out.</p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                      <button
                        onClick={dismissError}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Field-specific error messages */}
                {Object.keys(fieldErrors).length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-yellow-800 text-sm font-medium mb-2">Please fix the following issues:</p>
                        <ul className="text-yellow-700 text-sm space-y-1">
                          {Object.entries(fieldErrors).map(([field, message]) => (
                            <li key={field} className="flex items-center">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                              <strong className="capitalize">{field === 'fullName' ? 'Full Name' : field}:</strong>
                              <span className="ml-1">{message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('fullName')}`}
                          placeholder="Enter your first name"
                        />
                      </div>
                      {fieldErrors.fullName && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {fieldErrors.fullName}
                        </p>
                      )}
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
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('fullName')}`}
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
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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

                  {/* CRITICAL CHANGE: Phone field is now completely optional with no verification */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number (Optional)
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
                      Phone number is completely optional. No verification required.
                    </p>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Address *
                    </label>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Street Address *
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.address.street}
                            onChange={(e) => handleAddressChange('street', e.target.value)}
                            required
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('street')}`}
                            placeholder="123 Main Street, Apt 4B"
                          />
                        </div>
                        {fieldErrors.street && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {fieldErrors.street}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.address.city}
                            onChange={(e) => handleAddressChange('city', e.target.value)}
                            required
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('city')}`}
                            placeholder="New York"
                          />
                          {fieldErrors.city && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {fieldErrors.city}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            State *
                          </label>
                          <input
                            type="text"
                            value={formData.address.state}
                            onChange={(e) => handleAddressChange('state', e.target.value)}
                            required
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('state')}`}
                            placeholder="NY"
                          />
                          {fieldErrors.state && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {fieldErrors.state}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            value={formData.address.zipCode}
                            onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                            required
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${getFieldErrorClass('zipCode')}`}
                            placeholder="10001"
                          />
                          {fieldErrors.zipCode && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {fieldErrors.zipCode}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Country *
                          </label>
                          <select
                            value={formData.address.country}
                            onChange={(e) => handleAddressChange('country', e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            {countries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Info - REMOVED phone verification status */}
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
                        <span className="text-gray-600">Account Type:</span>
                        <p className="font-medium text-gray-900">
                          {getAccountTypeDisplay()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone Number:</span>
                        <p className="font-medium text-gray-900">
                          {user?.phone ? 'Provided' : 'Not Provided'}
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
                      disabled={loading || !hasChanges()}
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
                  
                  {/* Show helpful message when no changes detected */}
                  {!hasChanges() && !loading && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500">
                        Make changes to your information above to enable the save button
                      </p>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              /* Privacy & Security Settings */
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Privacy & Security</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage your privacy and security preferences</p>
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

                  {/* Account Deletion Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2 flex items-center">
                      <Trash2 className="h-5 w-5 mr-2" />
                      Delete Account
                    </h3>
                    <p className="text-red-700 text-sm mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete My Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                          <p className="text-red-800 text-sm font-medium mb-2">⚠️ Are you absolutely sure?</p>
                          <p className="text-red-700 text-sm">
                            This will permanently delete your account, all your data, and cannot be undone.
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-sm flex items-center"
                          >
                            {deleteLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Yes, Delete Forever
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleteLoading}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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