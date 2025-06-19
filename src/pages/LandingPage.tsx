import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MapPin, Users, Shield, Clock, Star } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDumperSignUp = () => {
    navigate('/auth/dumper');
  };

  const handleCollectorSignUp = () => {
    navigate('/auth/collector');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trash2 className="h-8 w-8 text-green-600" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">Scrubbed</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDumperSignUp}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Request Collection
              </button>
              <button
                onClick={handleCollectorSignUp}
                className="border border-green-600 text-green-600 px-6 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                Become Collector
              </button>
              
              {/* Badge */}
              <div className="ml-2">
                <img 
                  src="/black_circle_360x360 (1).png" 
                  alt="Powered by Bolt" 
                  className="h-10 w-10 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  title="Powered by Bolt"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Smart Waste Management
              <span className="text-green-600 block">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect with professional waste collectors in your area. Real-time matching, 
              secure payments, and eco-friendly disposal solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleDumperSignUp}
                className="bg-green-600 text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Request Collection
              </button>
              <button
                onClick={handleCollectorSignUp}
                className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-lg font-medium text-lg hover:bg-green-50 transition-colors flex items-center justify-center"
              >
                <Users className="h-5 w-5 mr-2" />
                Become a Collector
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Path
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you need waste collected or want to earn money collecting, we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Dumpers */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="text-center mb-8">
                <div className="p-4 bg-green-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Trash2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Need Waste Collected?</h3>
                <p className="text-gray-600">Get your waste picked up by verified professionals</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Real-time collector matching</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Flexible scheduling options</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Secure and insured service</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Rated and reviewed collectors</span>
                </div>
              </div>

              <button
                onClick={handleDumperSignUp}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Get Started as Customer
              </button>
            </div>

            {/* For Collectors */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="text-center mb-8">
                <div className="p-4 bg-blue-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Want to Earn Money?</h3>
                <p className="text-gray-600">Join our network of professional waste collectors</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Work in your local area</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Set your own schedule</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Professional support & tools</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Build your reputation</span>
                </div>
              </div>

              <button
                onClick={handleCollectorSignUp}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started as Collector
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get your waste collected in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Collection</h3>
              <p className="text-gray-600">
                Create a request with your waste type, location, and preferred time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Matched</h3>
              <p className="text-gray-600">
                Our system finds the best collector near you based on availability and specialization.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Collection Complete</h3>
              <p className="text-gray-600">
                Your waste is collected professionally and disposed of responsibly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of users who trust Scrubbed for their waste management needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDumperSignUp}
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-medium text-lg hover:bg-gray-50 transition-colors"
            >
              Start as Customer
            </button>
            <button
              onClick={handleCollectorSignUp}
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors"
            >
              Start as Collector
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trash2 className="h-6 w-6 text-green-600" />
            </div>
            <span className="ml-3 text-xl font-bold">Scrubbed</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Scrubbed. All rights reserved.</p>
            <p className="mt-2">Making waste management smarter, one collection at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};