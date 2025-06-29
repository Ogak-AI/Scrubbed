import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
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

  // CRITICAL FIX: More robust and detailed profile completion check
  const isValidFullName = (name: string | null): boolean => {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.includes(' '); // Require at least first and last name
  };

  const isValidAddress = (address: string | null): boolean => {
    if (!address) return false;
    const trimmed = address.trim();
    
    // Check if it's a JSON address object
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return !!(
          parsed.street && parsed.street.trim().length >= 5 &&
          parsed.city && parsed.city.trim().length >= 2 &&
          parsed.state && parsed.state.trim().length >= 2 &&
          parsed.zipCode && parsed.zipCode.trim().length >= 3 &&
          parsed.country && parsed.country.trim().length >= 2
        );
      }
    } catch {
      // If not JSON, treat as plain text address
      return trimmed.length >= 10; // Minimum reasonable address length
    }
    
    return false;
  };

  const hasValidFullName = isValidFullName(user.fullName);
  const hasValidAddress = isValidAddress(user.address);
  const needsProfileCompletion = !hasValidFullName || !hasValidAddress;
  
  // Check if user needs phone verification (only if they have a phone number)
  const needsPhoneVerification = user.phone && user.phone.trim().length > 0 && !verification.phoneVerified;
  
  console.log('App.tsx Detailed Profile Check:', {
    fullName: user.fullName,
    hasValidFullName,
    fullNameValid: isValidFullName(user.fullName),
    address: user.address,
    hasValidAddress,
    addressValid: isValidAddress(user.address),
    needsProfileCompletion,
    phone: user.phone,
    phoneVerified: verification.phoneVerified,
    needsPhoneVerification,
    finalDecision: needsProfileCompletion || needsPhoneVerification ? 'SHOW_VERIFICATION' : 'SHOW_DASHBOARD'
  });
  
  // If user needs profile completion OR phone verification, show verification page
  if (needsProfileCompletion || needsPhoneVerification) {
    console.log('Showing verification page - Profile incomplete or phone verification needed');
    return <VerificationPage />;
  }

  // Get the appropriate dashboard component based on user type
  const getDashboardComponent = () => {
    console.log('User profile is complete, rendering dashboard for user type:', user.userType);
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

  // User is authenticated and profile is complete - show their dashboard
  console.log('User is fully authenticated and verified, showing dashboard');
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
        
        {/* Verification route - redirect to dashboard if already verified */}
        <Route path="/verify" element={<Navigate to="/" replace />} />
        
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