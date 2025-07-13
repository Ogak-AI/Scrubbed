import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MapPin, Users, Shield, Clock, Star, Menu, X } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Request location permission when the page loads
  useEffect(() => {
    const requestLocationPermission = async () => {
      if ('geolocation' in navigator) {
        try {
          // Request location permission immediately
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
              }
            );
          });
          
          console.log('Location permission granted:', position.coords);
        } catch (error: unknown) {
          console.log('Location permission denied or failed:', error);
          
          // Show a user-friendly message about location
          if (error && typeof error === 'object' && 'code' in error) {
            const geolocationError = error as GeolocationPositionError;
            if (geolocationError.code === 1) { // PERMISSION_DENIED
              console.log('User denied location access');
            } else if (geolocationError.code === 2) { // POSITION_UNAVAILABLE
              console.log('Location unavailable');
            } else if (geolocationError.code === 3) { // TIMEOUT
              console.log('Location request timeout');
            }
          }
        }
      } else {
        console.log('Geolocation not supported');
      }
    };

    // Request location permission after a short delay to ensure page is loaded
    const timer = setTimeout(requestLocationPermission, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleDumperSignUp = () => {
    navigate('/auth/dumper');
  };

  const handleCollectorSignUp = () => {
    navigate('/under-development/collector-signup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 md:py-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <span className="ml-3 text-xl sm:text-2xl font-bold text-gray-900">Scrubbed</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={handleDumperSignUp}
                className="bg-green-600 text-white px-4 lg:px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm lg:text-base"
              >
                Request Collection
              </button>
              <button
                onClick={handleCollectorSignUp}
                className="border border-green-600 text-green-600 px-4 lg:px-6 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors text-sm lg:text-base"
              >
                Become Collector
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
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
            <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
              <button
                onClick={() => {
                  handleDumperSignUp();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Request Collection
              </button>
              <button
                onClick={() => {
                  handleCollectorSignUp();
                  setMobileMenuOpen(false);
                }}
                className="w-full border border-green-600 text-green-600 px-4 py-3 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                Become Collector
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Smart Waste Management
              <span className="text-green-600 block">Made Simple</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Connect with professional waste collectors in your area. Real-time matching, 
              secure payments, and eco-friendly disposal solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <button
                onClick={handleDumperSignUp}
                className="bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Request Collection
              </button>
              <button
                onClick={handleCollectorSignUp}
                className="border-2 border-green-600 text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg hover:bg-green-50 transition-colors flex items-center justify-center"
              >
                <Users className="h-5 w-5 mr-2" />
                Become a Collector
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Choose Your Path
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Whether you need waste collected or want to earn money collecting, we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* For Dumpers */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 sm:p-8 border border-green-200">
              <div className="text-center mb-6 sm:mb-8">
                <div className="p-3 sm:p-4 bg-green-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Need Waste Collected?</h3>
                <p className="text-gray-600 text-sm sm:text-base">Get your waste picked up by verified professionals</p>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Real-time collector matching</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Flexible scheduling options</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Secure and insured service</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Rated and reviewed collectors</span>
                </div>
              </div>

              <button
                onClick={handleDumperSignUp}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                Get Started as Customer
              </button>
            </div>

            {/* For Collectors */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 sm:p-8 border border-blue-200">
              <div className="text-center mb-6 sm:mb-8">
                <div className="p-3 sm:p-4 bg-blue-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Want to Earn Money?</h3>
                <p className="text-gray-600 text-sm sm:text-base">Join our network of professional waste collectors</p>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Work in your local area</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Set your own schedule</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Professional support & tools</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">Build your reputation</span>
                </div>
              </div>

              <button
                onClick={handleCollectorSignUp}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Get Started as Collector
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Get your waste collected in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Request Collection</h3>
              <p className="text-gray-600 text-sm sm:text-base px-2">
                Create a request with your waste type, location, and preferred time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Get Matched</h3>
              <p className="text-gray-600 text-sm sm:text-base px-2">
                Our system finds the best collector near you based on availability and specialization.
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Collection Complete</h3>
              <p className="text-gray-600 text-sm sm:text-base px-2">
                Your waste is collected professionally and disposed of responsibly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl text-green-100 mb-6 sm:mb-8 px-4">
            Join thousands of users who trust Scrubbed for their waste management needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <button
              onClick={handleDumperSignUp}
              className="bg-white text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg hover:bg-gray-50 transition-colors"
            >
              Start as Customer
            </button>
            <button
              onClick={handleCollectorSignUp}
              className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg hover:bg-green-700 transition-colors"
            >
              Start as Collector
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <span className="ml-3 text-lg sm:text-xl font-bold">Scrubbed</span>
          </div>
          <div className="text-center text-gray-400">
            <p className="text-sm sm:text-base">&copy; 2025 Scrubbed. All rights reserved.</p>
            <p className="mt-2 text-sm sm:text-base">Making waste management smarter, one collection at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};