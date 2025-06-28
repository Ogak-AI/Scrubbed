import React, { useState } from 'react';
import { Users, Trash2, MapPin, BarChart3, AlertCircle, LogOut, Bell, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <span className="ml-3 text-lg sm:text-2xl font-bold text-gray-900">Scrubbed Admin</span>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                  <p className="text-xs text-gray-600">Administrator</p>
                </div>
              </div>
              
              <button
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
              
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
              <div className="flex items-center space-x-3 px-2 py-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                  <p className="text-xs text-gray-600">Administrator</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <button className="w-full flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
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
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your waste collection platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">1,234</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Active Requests</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">89</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <Trash2 className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Collectors</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">45</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <MapPin className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">94%</p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Recent Requests */}
          <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                        <Trash2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">Household Waste Collection</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">123 Main Street, City</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">2 hours ago</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-800">High Request Volume</p>
                    <p className="text-xs text-red-600 mt-1">Unusual spike in requests detected</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-yellow-800">Collector Shortage</p>
                    <p className="text-xs text-yellow-600 mt-1">North district needs more collectors</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-blue-800">System Update</p>
                    <p className="text-xs text-blue-600 mt-1">Scheduled maintenance tonight</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button className="flex flex-col sm:flex-row items-center justify-center px-3 sm:px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0 sm:mr-2" />
                <span className="text-center sm:text-left">Manage Users</span>
              </button>
              <button className="flex flex-col sm:flex-row items-center justify-center px-3 sm:px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0 sm:mr-2" />
                <span className="text-center sm:text-left">View Requests</span>
              </button>
              <button className="flex flex-col sm:flex-row items-center justify-center px-3 sm:px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0 sm:mr-2" />
                <span className="text-center sm:text-left">Map View</span>
              </button>
              <button className="flex flex-col sm:flex-row items-center justify-center px-3 sm:px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0 sm:mr-2" />
                <span className="text-center sm:text-left">Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};