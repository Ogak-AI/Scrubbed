import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Package, AlertCircle, CheckCircle, RefreshCw, Upload, X } from 'lucide-react';
import { WASTE_TYPES } from '../../types';
import { supabase } from '../../lib/supabase';

interface RequestFormProps {
  onClose: () => void;
  onSubmit: (requestData: unknown) => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    wasteType: '',
    description: '',
    address: '',
    estimatedAmount: '',
    scheduledTime: '',
    photos: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.wasteType.trim()) {
      errors.wasteType = 'Please select a waste type';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Please enter a pickup address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadPhotoToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `waste-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('waste-photos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('waste-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setError(null);

    try {
      const newPhotos: string[] = [];
      
      for (let i = 0; i < Math.min(files.length, 5 - formData.photos.length); i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select only image files');
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Image size must be less than 5MB');
        }
        
        try {
          // Try to upload to Supabase Storage first
          const photoUrl = await uploadPhotoToSupabase(file);
          newPhotos.push(photoUrl);
        } catch {
          console.warn('Supabase storage not configured, using base64 fallback');
          // Fallback to base64 for demo purposes
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newPhotos.push(base64);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photos';
      setError(errorMessage);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    
    // Validate form before proceeding
    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const requestData = {
        wasteType: formData.wasteType,
        description: formData.description || undefined,
        location: currentLocation || { lat: 40.7128, lng: -74.0060 }, // Default to NYC if no location
        address: formData.address,
        scheduledTime: formData.scheduledTime || undefined,
        estimatedAmount: formData.estimatedAmount || undefined,
        photos: formData.photos.length > 0 ? formData.photos : undefined,
      };

      console.log('RequestForm: Submitting request:', requestData);
      await onSubmit(requestData);
      
      setSuccess(true);
      
      // Close form after a brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: unknown) {
      console.error('RequestForm: Error submitting request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create request. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a free geocoding service (OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Scrubbed-App/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Format the address nicely
        const address = data.address;
        let formattedAddress = '';
        
        if (address) {
          const parts = [];
          if (address.house_number) parts.push(address.house_number);
          if (address.road) parts.push(address.road);
          if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
          if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
          if (address.state) parts.push(address.state);
          if (address.postcode) parts.push(address.postcode);
          
          formattedAddress = parts.join(', ');
        }
        
        return formattedAddress || data.display_name;
      }
      
      throw new Error('Address not found');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinates if geocoding fails
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const getCurrentLocation = async () => {
    setError(null);
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for mobile
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      setCurrentLocation({
        lat: latitude,
        lng: longitude,
      });

      // Get human-readable address
      try {
        const address = await reverseGeocode(latitude, longitude);
        
        setFormData(prev => ({
          ...prev,
          address: address,
        }));

        // Clear any address validation errors
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.address;
          return newErrors;
        });
      } catch (geocodeError) {
        console.error('Geocoding failed:', geocodeError);
        // Still set the location even if geocoding fails
        setFormData(prev => ({
          ...prev,
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        }));
      }

    } catch (error: unknown) {
      console.error('Error getting location:', error);
      
      let errorMessage = 'Unable to get your location. ';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const geolocationError = error as GeolocationPositionError;
        switch (geolocationError.code) {
          case geolocationError.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings and try again.';
            break;
          case geolocationError.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please check your device settings.';
            break;
          case geolocationError.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please enter your address manually.';
            break;
        }
      } else {
        errorMessage += 'Please enter your address manually.';
      }
      
      setError(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center">
          <div className="p-3 bg-green-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Request Created!</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            Your waste collection request has been submitted successfully. 
            You'll be notified when collectors show interest.
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-3 disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">New Collection Request</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Waste Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waste Type *
              </label>
              <select
                value={formData.wasteType}
                onChange={(e) => handleInputChange('wasteType', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base ${
                  validationErrors.wasteType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select waste type</option>
                {WASTE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {validationErrors.wasteType && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validationErrors.wasteType}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Describe the waste items (optional)"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Location *
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base ${
                      validationErrors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter pickup address"
                  />
                </div>
                {validationErrors.address && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {validationErrors.address}
                  </p>
                )}
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="flex items-center text-green-600 hover:text-green-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locationLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-1" />
                      Use current location
                    </>
                  )}
                </button>
                {currentLocation && (
                  <p className="text-xs text-green-600">
                    ✓ Location detected and address updated
                  </p>
                )}
              </div>
            </div>

            {/* Estimated Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Amount
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.estimatedAmount}
                  onChange={(e) => handleInputChange('estimatedAmount', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="e.g., 2-3 bags, 1 box, etc."
                />
              </div>
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Pickup Time
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for ASAP pickup
              </p>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Optional)
              </label>
              
              {/* Photo Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto || formData.photos.length >= 5}
                />
                
                {uploadingPhoto ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-2"></div>
                    <span className="text-gray-600">Uploading photos...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-2">Add photos of your waste</p>
                    <label
                      htmlFor="photo-upload"
                      className={`inline-block text-green-600 hover:text-green-700 font-medium text-sm cursor-pointer ${
                        formData.photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {formData.photos.length >= 5 ? 'Maximum 5 photos' : 'Choose Files'}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5 photos, 5MB each. JPG, PNG, GIF supported.
                    </p>
                  </>
                )}
              </div>

              {/* Photo Preview */}
              {formData.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Uploaded Photos ({formData.photos.length}/5)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Request...
                  </div>
                ) : (
                  'Create Request'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">What happens next?</h4>
          <ol className="text-blue-700 text-xs sm:text-sm space-y-1">
            <li>1. Your request will be posted to nearby collectors</li>
            <li>2. You'll receive notifications when collectors show interest</li>
            <li>3. Choose your preferred collector and confirm the pickup</li>
            <li>4. Track your collection in real-time</li>
          </ol>
        </div>
      </div>
    </div>
  );
};