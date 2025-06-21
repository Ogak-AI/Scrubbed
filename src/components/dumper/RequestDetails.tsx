import React from 'react';
import { ArrowLeft, MapPin, Clock, Package, User, Phone, Mail, Star, MessageSquare, Camera, Calendar, Trash2, AlertTriangle, X } from 'lucide-react';
import { useWasteRequests } from '../../hooks/useWasteRequests';
import type { WasteRequest } from '../../types';

interface RequestDetailsProps {
  request: WasteRequest;
  onClose: () => void;
}

export const RequestDetails: React.FC<RequestDetailsProps> = ({ request, onClose }) => {
  const { updateRequestStatus } = useWasteRequests();
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'matched': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'matched': return <User className="h-4 w-4" />;
      case 'in_progress': return <Trash2 className="h-4 w-4" />;
      case 'completed': return <Star className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your request is waiting to be matched with a collector in your area.';
      case 'matched':
        return 'A collector has been assigned to your request and will contact you soon.';
      case 'in_progress':
        return 'Your waste is currently being collected.';
      case 'completed':
        return 'Your waste has been successfully collected and disposed of.';
      case 'cancelled':
        return 'This request has been cancelled.';
      default:
        return 'Status unknown.';
    }
  };

  const handleCancelRequest = async () => {
    if (!window.confirm('Are you sure you want to cancel this request? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      console.log('Cancelling request:', request.id);
      await updateRequestStatus(request.id, 'cancelled');
      console.log('Request cancelled successfully');
      
      // Show success message briefly before closing or updating
      setTimeout(() => {
        setCancelling(false);
        // Optionally close the details view after successful cancellation
        // onClose();
      }, 1000);
      
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      setError(err.message || 'Failed to cancel request. Please try again.');
      setCancelling(false);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-3 sm:py-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-2 sm:mr-3 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Request Details</h1>
              <p className="text-xs sm:text-sm text-gray-600">#{request.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={dismissError}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success Message for Cancelled Status */}
        {request.status === 'cancelled' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm font-medium">This request has been cancelled.</p>
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <h2 className="text-lg font-semibold text-gray-900">Request Status</h2>
                <div className={`flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getStatusColor(request.status)} self-start`}>
                  {getStatusIcon(request.status)}
                  <span className="ml-2">{request.status.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">{getStatusDescription(request.status)}</p>
              
              {/* Progress Timeline - Mobile Optimized */}
              <div className="space-y-3 sm:space-y-0">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
                
                {/* Mobile: Vertical Timeline */}
                <div className="sm:hidden space-y-3">
                  <div className={`flex items-center ${request.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                    <div className={`w-3 h-3 rounded-full ${request.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'} mr-3`}></div>
                    <span className="text-sm font-medium">Requested</span>
                  </div>
                  <div className={`flex items-center ${['matched', 'in_progress', 'completed'].includes(request.status) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${['matched', 'in_progress', 'completed'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'} mr-3`}></div>
                    <span className="text-sm font-medium">Matched</span>
                  </div>
                  <div className={`flex items-center ${['in_progress', 'completed'].includes(request.status) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${['in_progress', 'completed'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'} mr-3`}></div>
                    <span className="text-sm font-medium">In Progress</span>
                  </div>
                  <div className={`flex items-center ${request.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${request.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'} mr-3`}></div>
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                </div>

                {/* Desktop: Horizontal Timeline */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className={`flex items-center ${request.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                    <div className={`w-3 h-3 rounded-full ${request.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'} mr-2`}></div>
                    <span className="text-sm font-medium">Requested</span>
                  </div>
                  <div className={`flex items-center ${['matched', 'in_progress', 'completed'].includes(request.status) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${['matched', 'in_progress', 'completed'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                    <span className="text-sm font-medium">Matched</span>
                  </div>
                  <div className={`flex items-center ${['in_progress', 'completed'].includes(request.status) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${['in_progress', 'completed'].includes(request.status) ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                    <span className="text-sm font-medium">In Progress</span>
                  </div>
                  <div className={`flex items-center ${request.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${request.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Trash2 className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Waste Type</p>
                    <p className="text-gray-600 text-sm sm:text-base">{request.wasteType}</p>
                  </div>
                </div>

                {request.description && (
                  <div className="flex items-start">
                    <MessageSquare className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Description</p>
                      <p className="text-gray-600 text-sm sm:text-base break-words">{request.description}</p>
                    </div>
                  </div>
                )}

                {request.estimatedAmount && (
                  <div className="flex items-start">
                    <Package className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Estimated Amount</p>
                      <p className="text-gray-600 text-sm sm:text-base">{request.estimatedAmount}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Pickup Location</p>
                    <p className="text-gray-600 text-sm sm:text-base break-words">{request.address}</p>
                  </div>
                </div>

                {request.scheduledTime && (
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Scheduled Time</p>
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="hidden sm:inline">{formatDate(request.scheduledTime)}</span>
                        <span className="sm:hidden">{formatDateShort(request.scheduledTime)}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Created</p>
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="hidden sm:inline">{formatDate(request.createdAt)}</span>
                      <span className="sm:hidden">{formatDateShort(request.createdAt)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Photos */}
            {request.photos && request.photos.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Camera className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Photos ({request.photos.length})</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {request.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Waste photo ${index + 1}`}
                        className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photo, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {request.status === 'pending' && (
                  <button 
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                    className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center"
                  >
                    {cancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Cancel Request
                      </>
                    )}
                  </button>
                )}
                
                {request.status === 'matched' && (
                  <>
                    <button className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm">
                      Contact Collector
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
                      View Collector Profile
                    </button>
                  </>
                )}
                
                {request.status === 'completed' && (
                  <button className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                    Rate & Review
                  </button>
                )}

                {request.status === 'cancelled' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm text-center">
                      This request has been cancelled and cannot be modified.
                    </p>
                  </div>
                )}
                
                <button className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
                  Share Request
                </button>
              </div>
            </div>

            {/* Collector Info (if matched) */}
            {request.collectorId && request.status !== 'cancelled' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Collector</h3>
                
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Professional Collector</p>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-600">4.8 (127 reviews)</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Collector
                  </button>
                  <button className="w-full flex items-center justify-center border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                </div>
              </div>
            )}

            {/* Request Summary */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Request ID:</span>
                  <span className="font-medium text-gray-900 text-right">#{request.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-gray-900 text-right capitalize">{request.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900 text-right">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {request.scheduledTime && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium text-gray-900 text-right">
                      {new Date(request.scheduledTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};