import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { VerificationPage } from './components/auth/VerificationPage';
import { DumperDashboard } from './components/dumper/DumperDashboard';
import { CollectorDashboard } from './components/collector/CollectorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, loading, verification } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
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

  // Debug logging for user type detection
  console.log('Current user:', user);
  console.log('User type:', user.userType);

  // Check if user needs phone verification (only if they have a phone number)
  const needsVerification = user.phone && !verification.phoneVerified;
  
  if (needsVerification) {
    return <VerificationPage />;
  }

  // Get the appropriate dashboard component based on user type
  const getDashboardComponent = () => {
    console.log('Getting dashboard for user type:', user.userType);
    
    switch (user.userType) {
      case 'dumper':
        console.log('Rendering DumperDashboard');
        return <DumperDashboard />;
      case 'collector':
        console.log('Rendering CollectorDashboard');
        return <CollectorDashboard />;
      case 'admin':
        console.log('Rendering AdminDashboard');
        return <AdminDashboard />;
      default:
        console.log('Unknown user type, defaulting to DumperDashboard');
        return <DumperDashboard />; // Default fallback
    }
  };

  // User is authenticated - show their dashboard
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
        
        {/* Verification route */}
        <Route path="/verify" element={<VerificationPage />} />
        
        {/* Redirect any auth routes to dashboard if already logged in */}
        <Route path="/auth/*" element={<Navigate to="/" replace />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;