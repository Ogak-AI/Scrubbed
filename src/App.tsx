import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AppProvider } from './contexts/AppContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DumperDashboard } from './components/dumper/DumperDashboard';
import { CollectorDashboard } from './components/collector/CollectorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // If no user, show landing page or auth page
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/:userType" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  // Get the appropriate dashboard component based on user type
  const getDashboardComponent = () => {
    console.log('Showing dashboard for user type:', user.userType);
    switch (user.userType) {
      case 'dumper':
        return <DumperDashboard />;
      case 'collector':
        return <CollectorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <DumperDashboard />; // Default fallback
    }
  };

  // User is authenticated - show their dashboard directly
  return (
    <Router>
      <Routes>
        {/* Main dashboard route - redirect to appropriate dashboard */}
        <Route path="/" element={getDashboardComponent()} />
        <Route path="/dashboard" element={getDashboardComponent()} />
        
        {/* Specific dashboard routes */}
        <Route path="/dumper" element={<DumperDashboard />} />
        <Route path="/collector" element={<CollectorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Redirect any auth routes to dashboard if already logged in */}
        <Route path="/auth/*" element={<Navigate to="/" replace />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  try {
    return (
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    );
  } catch (error) {
    console.error('App component error:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Application Error</h1>
          <p className="text-red-600 mb-4">The application failed to load properly.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default App;