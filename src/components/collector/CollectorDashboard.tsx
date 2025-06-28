import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, Trash2, User, Settings, LogOut, Bell, Star, Navigation, AlertCircle, RefreshCw, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollectors } from '../../hooks/useCollectors';
import { useWasteRequests } from '../../hooks/useWasteRequests';
import { ProfileSettings } from '../common/ProfileSettings';

export const CollectorDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { myCollectorProfile, loading: collectorsLoading, createCollectorProfile, updateAvailability, updateLocation } = useCollectors();
  const { requests, loading: requestsLoading, acceptRequest, updateRequestStatus, error } = useWasteRequests();
  const [isAvailable, setIsAvailable] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter requests for collector view - only show pending requests within 4km from dumpers
  const availableRequests = requests.filter(r => {
    // Only show pending requests that don't have a collector assigned
    if (r.status !== 'pending' || r.collectorId) return false;
    
    // Don't show requests created by this collector (collectors shouldn't create requests)
    if (r.dumperId === user?.id) return false;
    
    // If we have current location, filter by distance (4km radius)
    if (currentLocation && r.location) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        r.location.lat,
        r.location.lng
      );
      return distance <= 4; // 4km radius
    }
    
    // If no location available, don't show any requests (location is required for collectors)
    return false;
  });

  // Filter for collector's accepted jobs only
  const myJobs = requests.filter(r => r.collectorId === user?.id);

  useEffect(() => {
    if (myCollectorProfile) {
      setIsAvailable(myCollectorProfile.isAvailable);
    }
  }, [myCollectorProfile]);

  // Auto-create collector profile if it doesn't exist
  useEffect(() => {
    const autoCreateCollectorProfile = async () => {
      if (user?.userType === 'collector' && !myCollectorProfile && !collectorsLoading && !creatingProfile) {
        setCreatingProfile(true);
        try {
          console.log('Auto-creating collector profile for user:', user.id);
          
          // Create a basic collector profile with default values
          const defaultProfileData = {
            specializations: ['Household', 'Recyclable'], // Default specializations
            serviceRadius: 10, // Default 10km radius
            vehicleType: 'pickup_truck',
            experience: 'intermediate',
          };

          await createCollectorProfile(defaultProfileData);
          console.log('Collector profile created successfully');
        } catch (error) {
          console.error('Error auto-creating collector profile:', error);
          // Don't block the user if profile creation fails
        } finally {
          setCreatingProfile(false);
        }
      }
    };

    autoCreateCollectorProfile();
  }, [user, myCollectorProfile, collectorsLoading, createCollectorProfile, creatingProfile]);

  // Enhanced geolocation function with better mobile support
  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    // Enhanced options for mobile devices
    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout for mobile
      maximumAge: 300000 // 5 minutes cache
    };

    const successCallback = (position: GeolocationPosition) => {
      try {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        console.log('Location obtained:', location);
        setCurrentLocation(location);
        setLocationError(null);
        
        // Update location in database if collector profile exists
        if (myCollectorProfile) {
          updateLocation(location).catch(error => {
            console.error('Error updating location in database:', error);
            // Don't show error to user for database update failures
          });
        }
      } catch (error) {
        console.error('Error processing location:', error);
        setLocationError('Error processing location data.');
      } finally {
        setLocationLoading(false);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      setLocationLoading(false);
      
      let errorMessage = 'Unable to get your location. ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please allow location access in your browser settings and refresh the page.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Location information is unavailable. Please check your device settings.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage += 'Please enable location services and try again.';
          break;
      }
      
      setLocationError(errorMessage);
    };

    // Use the enhanced geolocation call
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, [myCollectorProfile, updateLocation]);

  // Get current location on component mount with better error handling
  useEffect(() => {
    // Only auto-request location if available and collector profile exists
    if (isAvailable && myCollectorProfile && !currentLocation && !locationLoading) {
      getCurrentLocation();
    }

    // Set up periodic location updates (every 5 minutes) only if user is available
    let locationInterval: NodeJS.Timeout | null = null;
    
    if (isAvailable && myCollectorProfile && currentLocation) {
      locationInterval = setInterval(() => {
        if (isAvailable && myCollectorProfile) {
          getCurrentLocation();
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [myCollectorProfile, isAvailable, currentLocation, locationLoading, getCurrentLocation]);

  const handleAvailabilityToggle = async () => {
    try {
      const newAvailability = !isAvailable;
      await updateAvailability(newAvailability);
      setIsAvailable(newAvailability);
      
      // If becoming available and no location, request it
      if (newAvailability && !currentLocation && !locationLoading) {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: 'in_progress' | 'completed') => {
    try {
      await updateRequestStatus(requestId, status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleOpenProfileSettings = () => {
    setShowProfileMenu(false);
    setShowProfileSettings(true);
  };

  const handleCloseProfileSettings = () => {
    setShowProfileSettings(false);
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  if (collectorsLoading || creatingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {creatingProfile ? 'Setting up your collector profile...' : 'Loading your account...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  if (showProfileSettings) {
    return <ProfileSettings onClose={handleCloseProfileSettings} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Scrubbed Collector</h1>
                <p className="text-xs sm:text-sm text-gray-600">Professional Dashboard</p>
              </div>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Available:</span>
                <button
                  onClick={handleAvailabilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-2 bg-green-100 rounded-full">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                    <p className="text-xs text-gray-600">Collector</p>
                  </div>
                </button>
                
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleOpenProfileSettings}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
              
              {/* Badge */}
              <div className="ml-2">
                <img 
                  src="/black_circle_360x360 (1).png" 
                  alt="Powered by Bolt" 
                  className="h-8 w-8 lg:h-10 lg:w-10 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  title="Powered by Bolt"
                />
              </div>
            </div>

            {/* Mobile Header Actions */}
            <div className="lg:hidden flex items-center space-x-2">
              <img 
                src="/black_circle_360x360 (1).png" 
                alt="Powered by Bolt" 
                className="h-8 w-8 rounded-full shadow-sm"
                title="Powered by Bolt"
              />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4 space-y-3">
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                    <p className="text-xs text-gray-600">Collector</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Available:</span>
                  <button
                    onClick={handleAvailabilityToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isAvailable ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAvailable ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <button className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenProfileSettings();
                  }}
                  className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Profile Settings
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Location Status */}
        {locationError ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-yellow-700 text-sm font-medium">Location Required</p>
                  <p className="text-yellow-600 text-sm">{locationError}</p>
                </div>
              </div>
              <button
                onClick={refreshLocation}
                disabled={locationLoading}
                className="flex items-center text-yellow-700 hover:text-yellow-800 font-medium text-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${locationLoading ? 'animate-spin' : ''}`} />
                {locationLoading ? 'Getting...' : 'Retry'}
              </button>
            </div>
          </div>
        ) : currentLocation ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700 text-sm">
                  Location active - showing requests within 4km radius
                </p>
              </div>
              <button
                onClick={refreshLocation}
                disabled={locationLoading}
                className="flex items-center text-green-700 hover:text-green-800 font-medium text-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${locationLoading ? 'animate-spin' : ''}`} />
                {locationLoading ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>
        ) : locationLoading ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <p className="text-blue-700 text-sm">Getting your location...</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                <p className="text-gray-700 text-sm">
                  Location needed to show nearby requests
                </p>
              </div>
              <button
                onClick={refreshLocation}
                disabled={locationLoading}
                className="flex items-center text-gray-700 hover:text-gray-800 font-medium text-sm disabled:opacity-50"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Enable Location
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{myJobs.length}</p>
              </div>
              <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Available Nearby</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{availableRequests.length}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Rating</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                  {myCollectorProfile?.rating ? myCollectorProfile.rating.toFixed(1) : 'New'}
                </p>
              </div>
              <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Collections</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{myCollectorProfile?.totalCollections || 0}</p>
              </div>
              <Navigation className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Available Requests */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Available Requests</h3>
              <p className="text-sm text-gray-600">
                {currentLocation ? 'Requests within 4km of your location' : 'Enable location to see nearby requests'}
              </p>
            </div>
            
            <div className="p-4 sm:p-6">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : !currentLocation ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Location Required</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    Please enable location access to see collection requests near you.
                  </p>
                  <button
                    onClick={refreshLocation}
                    disabled={locationLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting Location...
                      </div>
                    ) : (
                      'Enable Location'
                    )}
                  </button>
                </div>
              ) : availableRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No requests available</h4>
                  <p className="text-gray-600 text-sm">
                    No collection requests within 4km of your location. Check back later for new opportunities.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{request.wasteType} Waste</h4>
                          {request.estimatedAmount && (
                            <p className="text-sm text-gray-600">{request.estimatedAmount}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)} mt-2 sm:mt-0 self-start`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {request.description && (
                        <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-4 space-y-2 sm:space-y-0">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{request.address}</span>
                        </div>
                        {currentLocation && (
                          <div className="flex items-center">
                            <Navigation className="h-4 w-4 mr-1 flex-shrink-0" />
                            {calculateDistance(currentLocation.lat, currentLocation.lng, request.location.lat, request.location.lng).toFixed(1)} km away
                          </div>
                        )}
                      </div>
                      
                      {request.scheduledTime && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <Clock className="h-4 w-4 mr-1" />
                          Scheduled: {formatDate(request.scheduledTime)}
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Accept Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Jobs */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">My Jobs</h3>
              <p className="text-sm text-gray-600">Your accepted and ongoing collections</p>
            </div>
            
            <div className="p-4 sm:p-6">
              {myJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No active jobs</h4>
                  <p className="text-gray-600 text-sm">Accept requests from the available list to start earning.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{job.wasteType} Waste</h4>
                          {job.estimatedAmount && (
                            <p className="text-sm text-gray-600">{job.estimatedAmount}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)} mt-2 sm:mt-0 self-start`}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      {job.description && (
                        <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-4 space-y-2 sm:space-y-0">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{job.address}</span>
                        </div>
                        {currentLocation && (
                          <div className="flex items-center">
                            <Navigation className="h-4 w-4 mr-1 flex-shrink-0" />
                            {calculateDistance(currentLocation.lat, currentLocation.lng, job.location.lat, job.location.lng).toFixed(1)} km away
                          </div>
                        )}
                      </div>
                      
                      {job.scheduledTime && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <Clock className="h-4 w-4 mr-1" />
                          Scheduled: {formatDate(job.scheduledTime)}
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        {job.status === 'matched' && (
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                          >
                            Start Collection
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'completed')}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
                          Contact Customer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};