import React, { useState, useMemo } from 'react';
import { Plus, MapPin, Clock, Trash2, User, Settings, LogOut, Bell, Search, AlertCircle, RefreshCw, Menu, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useWasteRequests } from '../../hooks/useWasteRequests';
import { useChat } from '../../hooks/useChat';
import { RequestForm } from './RequestForm';
import { RequestDetails } from './RequestDetails';
import { ProfileSettings } from '../common/ProfileSettings';
import { ChatInterface } from '../chat/ChatInterface';
import type { WasteRequest } from '../../types';

export const DumperDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { requests, loading, error, createRequest } = useWasteRequests();
  const { getUnreadCount } = useChat();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'matched' | 'in_progress' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // PERFORMANCE: Memoize filtered requests to prevent unnecessary re-renders
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesFilter = filter === 'all' || request.status === filter;
      const matchesSearch = searchTerm === '' || 
        request.wasteType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.description && request.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  // PERFORMANCE: Memoize stats calculations
  const stats = useMemo(() => {
    const activeRequests = requests.filter(r => ['pending', 'matched', 'in_progress'].includes(r.status)).length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    return { activeRequests, completedRequests };
  }, [requests]);

  // Get unread message count
  const unreadCount = getUnreadCount();

  // PERFORMANCE: Memoize helper functions
  const getStatusColor = useMemo(() => (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const formatDate = useMemo(() => (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // PERFORMANCE: Memoize user's first name
  const firstName = useMemo(() => {
    if (user?.fullName && user.fullName.trim()) {
      const firstName = user.fullName.trim().split(' ')[0];
      if (firstName && firstName.length > 0) {
        return firstName;
      }
    }
    
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      const cleanUsername = emailUsername.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanUsername.length > 0) {
        return cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1).toLowerCase();
      }
    }
    
    return 'there';
  }, [user?.fullName, user?.email]);

  const handleCreateRequest = async (requestData: unknown) => {
    try {
      setCreateError(null);
      await createRequest(requestData);
      setShowRequestForm(false);
    } catch (error: unknown) {
      console.error('Dashboard: Error creating request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create request. Please try again.';
      setCreateError(errorMessage);
    }
  };

  const handleViewDetails = (request: WasteRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetails = () => {
    setSelectedRequest(null);
  };

  const handleOpenProfileSettings = () => {
    setShowProfileMenu(false);
    setShowProfileSettings(true);
  };

  const handleCloseProfileSettings = () => {
    setShowProfileSettings(false);
  };

  const handleOpenChat = () => {
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  // Show profile settings if requested
  if (showProfileSettings) {
    return <ProfileSettings onClose={handleCloseProfileSettings} />;
  }

  // Show chat interface if requested
  if (showChat) {
    return <ChatInterface onClose={handleCloseChat} />;
  }

  // Show request details if a request is selected
  if (selectedRequest) {
    return <RequestDetails request={selectedRequest} onClose={handleCloseDetails} />;
  }

  if (showRequestForm) {
    return (
      <div>
        {createError && (
          <div className="fixed top-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{createError}</p>
            </div>
          </div>
        )}
        <RequestForm 
          onClose={() => {
            setShowRequestForm(false);
            setCreateError(null);
          }}
          onSubmit={handleCreateRequest}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <span className="ml-3 text-xl sm:text-2xl font-bold text-gray-900">Scrubbed</span>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={handleOpenChat}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative"
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
                    <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
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
              <div className="relative">
                <button 
                  onClick={handleOpenChat}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 relative"
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
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
              <div className="flex items-center space-x-3 px-2 py-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenChat();
                  }}
                  className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
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
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {firstName}!
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">Manage your waste collection requests and track their progress.</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <button
            onClick={() => setShowRequestForm(true)}
            className="bg-green-600 text-white p-4 sm:p-6 rounded-xl hover:bg-green-700 transition-colors group col-span-1 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-semibold mb-1">New Request</h3>
                <p className="text-green-100 text-sm">Schedule a pickup</p>
              </div>
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
            </div>
          </button>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Active Requests</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {stats.activeRequests}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Completed</h3>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {stats.completedRequests}
                </p>
              </div>
              <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Requests Section */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Your Requests</h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm w-full sm:w-auto"
                  />
                </div>
                
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm w-full sm:w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="matched">Matched</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading your requests...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No requests found</h4>
                <p className="text-gray-600 mb-6 px-4">
                  {filter === 'all' && searchTerm === ''
                    ? "You haven't created any waste collection requests yet."
                    : `No requests match your current filters.`
                  }
                </p>
                {filter === 'all' && searchTerm === '' && (
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Create Your First Request
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{request.wasteType} Waste</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)} self-start`}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {request.estimatedAmount && (
                            <span className="text-sm text-gray-500">({request.estimatedAmount})</span>
                          )}
                        </div>
                        
                        {request.description && (
                          <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{request.address}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                            {request.scheduledTime ? formatDate(request.scheduledTime) : 'ASAP'}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-400">
                          Created: {formatDate(request.createdAt)}
                        </div>
                      </div>
                      
                      <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col sm:items-end space-y-2">
                        <button 
                          onClick={() => handleViewDetails(request)}
                          className="text-green-600 hover:text-green-700 font-medium text-sm"
                        >
                          View Details
                        </button>
                        
                        {/* Show chat button for matched or in-progress requests */}
                        {(request.status === 'matched' || request.status === 'in_progress') && request.collectorId && (
                          <button 
                            onClick={() => {
                              setSelectedChatRequest({
                                requestId: request.id,
                                dumperId: request.dumperId,
                                collectorId: request.collectorId!
                              });
                              setShowChat(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat with Collector
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Setup Notice */}
        {!loading && requests.length === 0 && !error && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h4 className="font-medium text-blue-800 mb-2">🚀 Getting Started</h4>
            <p className="text-blue-700 text-sm mb-4">
              To see your requests and connect with collectors, make sure you have:
            </p>
            <ol className="text-blue-700 text-sm space-y-1 mb-4">
              <li>1. ✅ Signed in with your Google account</li>
              <li>2. ✅ Completed your profile setup</li>
              <li>3. 📝 Created your first waste collection request</li>
              <li>4. 🔗 Connected to Supabase database (check your .env file)</li>
            </ol>
            <button
              onClick={() => setShowRequestForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Create Your First Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};