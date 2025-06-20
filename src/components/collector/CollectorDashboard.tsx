import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Trash2, User, Settings, LogOut, Bell, DollarSign, Star, Navigation, AlertCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCollectors } from '../../hooks/useCollectors';
import { useWasteRequests } from '../../hooks/useWasteRequests';
import { CollectorOnboarding } from './CollectorOnboarding';

export const CollectorDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { myCollectorProfile, loading: collectorsLoading, createCollectorProfile, updateAvailability, updateLocation } = useCollectors();
  const { requests, loading: requestsLoading, acceptRequest, updateRequestStatus, error } = useWasteRequests();
  const [isAvailable, setIsAvailable] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Filter requests for collector view - only show pending requests within 4km
  const availableRequests = requests.filter(r => {
    if (r.status !== 'pending' || r.collectorId) return false;
    
    // If we have current location, filter by distance
    if (currentLocation && r.location) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        r.location.lat,
        r.location.lng
      );
      return distance <= 4; // 4km radius
    }
    
    return true; // Show all if no location available
  });

  const myJobs = requests.filter(r => r.collectorId === user?.id);

  useEffect(() => {
    if (myCollectorProfile) {
      setIsAvailable(myCollectorProfile.isAvailable);
    }
  }, [myCollectorProfile]);

  // Get current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          
          // Update location in database if collector profile exists
          if (myCollectorProfile) {
            updateLocation(location).catch(console.error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, [myCollectorProfile, updateLocation]);

  const handleCompleteOnboarding = async (profileData: any) => {
    try {
      await createCollectorProfile(profileData);
    } catch (error) {
      console.error('Error creating collector profile:', error);
    }
  };

  const handleAvailabilityToggle = async () => {
    try {
      const newAvailability = !isAvailable;
      await updateAvailability(newAvailability);
      setIsAvailable(newAvailability);
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

  if (collectorsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!myCollectorProfile) {
    return <CollectorOnboarding onComplete={handleCompleteOnboarding} />;
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
                      onClick={() => {
                        setShowProfileMenu(false);
                        // Add profile settings functionality here
                      }}
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
                <button className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
        {currentLocation && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-500 mr-2" />
              <p className="text-blue-700 text-sm">
                Location active - showing requests within 4km radius
              </p>
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
                  {myCollectorProfile.rating ? myCollectorProfile.rating.toFixed(1) : 'New'}
                </p>
              </div>
              <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Collections</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{myCollectorProfile.totalCollections}</p>
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
                {currentLocation ? 'Requests within 4km of your location' : 'All pending requests'}
              </p>
            </div>
            
            <div className="p-4 sm:p-6">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : availableRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No requests available</h4>
                  <p className="text-gray-600 text-sm">
                    {currentLocation 
                      ? 'No collection requests within 4km of your location.' 
                      : 'Check back later for new collection opportunities.'
                    }
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