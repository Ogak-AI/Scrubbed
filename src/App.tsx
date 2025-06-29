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

  // CRITICAL FIX: More robust profile completion validation
  const isProfileComplete = (): boolean => {
    // Check if full name is valid (must have at least first and last name)
    const hasValidFullName = (): boolean => {
      if (!user.fullName || typeof user.fullName !== 'string') return false;
      const trimmed = user.fullName.trim();
      // Must be at least 3 characters and contain a space (first + last name)
      return trimmed.length >= 3 && trimmed.includes(' ') && trimmed.split(' ').filter(part => part.length > 0).length >= 2;
    };

    // Check if address is valid and complete
    const hasValidAddress = (): boolean => {
      if (!user.address || typeof user.address !== 'string') return false;
      const trimmed = user.address.trim();
      
      // If it's less than 10 characters, it's definitely incomplete
      if (trimmed.length < 10) return false;
      
      try {
        // Try to parse as JSON (structured address)
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          const requiredFields = ['street', 'city', 'state', 'zipCode', 'country'];
          return requiredFields.every(field => {
            const value = parsed[field];
            return value && typeof value === 'string' && value.trim().length >= 2;
          });
        }
      } catch {
        // If not JSON, treat as plain text address
        // A complete address should have at least 15 characters and contain common address indicators
        return trimmed.length >= 15 && (
          trimmed.includes(',') || 
          /\d/.test(trimmed) || // Contains numbers
          /street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd/i.test(trimmed)
        );
      }
      
      return false;
    };

    const validFullName = hasValidFullName();
    const validAddress = hasValidAddress();
    
    console.log('App.tsx Profile Completion Check:', {
      fullName: user.fullName,
      validFullName,
      address: user.address,
      validAddress,
      isComplete: validFullName && validAddress
    });
    
    return validFullName && validAddress;
  };

  // CRITICAL FIX: Enhanced phone verification logic
  const needsPhoneVerification = (): boolean => {
    // Only require phone verification if:
    // 1. User has provided a phone number
    // 2. The phone number is not empty/null
    // 3. The phone is not yet verified
    const hasPhoneNumber = user.phone && typeof user.phone === 'string' && user.phone.trim().length > 0;
    const phoneNotVerified = !verification.phoneVerified;
    
    const needsVerification = hasPhoneNumber && phoneNotVerified;
    
    console.log('App.tsx Phone Verification Check:', {
      phone: user.phone,
      hasPhoneNumber,
      phoneVerified: verification.phoneVerified,
      needsVerification
    });
    
    return needsVerification;
  };

  const profileComplete = isProfileComplete();
  const phoneVerificationNeeded = needsPhoneVerification();
  
  // CRITICAL FIX: Only show verification page if profile is incomplete OR phone verification is needed
  const shouldShowVerification = !profileComplete || phoneVerificationNeeded;
  
  console.log('App.tsx Final Decision:', {
    profileComplete,
    phoneVerificationNeeded,
    shouldShowVerification,
    decision: shouldShowVerification ? 'SHOW_VERIFICATION_PAGE' : 'SHOW_DASHBOARD'
  });
  
  if (shouldShowVerification) {
    return <VerificationPage />;
  }

  // Get the appropriate dashboard component based on user type
  const getDashboardComponent = () => {
    console.log('Profile is complete and verified, showing dashboard for user type:', user.userType);
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