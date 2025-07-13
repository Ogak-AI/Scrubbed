import React from 'react';
import { ArrowLeft, Construction, Clock, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export const UnderDevelopmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useParams<{ feature: string }>();

  const getFeatureInfo = () => {
    switch (feature) {
      case 'collector-signup':
        return {
          title: 'Collector Registration',
          description: 'Professional waste collector onboarding and verification system',
          features: [
            'Identity verification and background checks',
            'Vehicle and equipment certification',
            'Insurance and licensing validation',
            'Professional training modules',
            'Service area optimization tools'
          ]
        };
      case 'dumper-signup':
        return {
          title: 'Customer Registration',
          description: 'Enhanced customer onboarding with advanced features',
          features: [
            'Smart address verification',
            'Waste type categorization wizard',
            'Subscription and recurring pickup options',
            'Environmental impact tracking',
            'Loyalty rewards program'
          ]
        };
      default:
        return {
          title: 'New Feature',
          description: 'This exciting new feature is currently under development',
          features: [
            'Enhanced user experience',
            'Advanced functionality',
            'Improved performance',
            'Better security',
            'Mobile optimization'
          ]
        };
    }
  };

  const featureInfo = getFeatureInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-3 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Construction className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Under Development</h1>
                <p className="text-sm text-gray-600">Coming soon to Scrubbed</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="p-4 bg-blue-100 rounded-full w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center">
            <Construction className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {featureInfo.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {featureInfo.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* What's Coming */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <Clock className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">What's Coming</h3>
            </div>
            <ul className="space-y-3">
              {featureInfo.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <Construction className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Development Timeline</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 1: Planning & Design</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 2: Development</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 3: Testing</p>
                  <p className="text-sm text-gray-600">Coming Soon</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 4: Launch</p>
                  <p className="text-sm text-gray-600">Q2 2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 sm:p-8 text-center text-white">
          <h3 className="text-xl sm:text-2xl font-bold mb-4">Stay Updated</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            We're working hard to bring you this feature. In the meantime, you can use our existing platform to get started with waste collection services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Back to Homepage
            </button>
            <button
              onClick={() => navigate('/auth/dumper')}
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-colors"
            >
              Try Current Platform
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 sm:mt-12 bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">When will this feature be available?</h4>
              <p className="text-gray-600">We're targeting Q2 2025 for the full release. We'll notify all users when it's ready.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Can I use the current platform in the meantime?</h4>
              <p className="text-gray-600">Absolutely! Our current platform is fully functional and ready to help you with waste collection services.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Will my current account work with the new features?</h4>
              <p className="text-gray-600">Yes, all existing accounts will seamlessly transition to the new features when they're released.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};