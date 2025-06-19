import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Users, ArrowLeft } from 'lucide-react';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export const AuthPage: React.FC = () => {
  const { userType } = useParams<{ userType: 'dumper' | 'collector' }>();
  const navigate = useNavigate();

  const isDumper = userType === 'dumper';
  const isCollector = userType === 'collector';

  // If no userType specified, redirect to landing page
  if (!userType || (!isDumper && !isCollector)) {
    navigate('/');
    return null;
  }

  const getPageConfig = () => {
    if (isDumper) {
      return {
        title: 'Sign in as Customer',
        subtitle: 'Get your waste collected by professionals',
        icon: Trash2,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        features: [
          'Request waste collection services',
          'Real-time collector matching',
          'Track collections in real-time',
          'Secure payments and ratings'
        ],
        featureBg: 'bg-green-50',
        featureBorder: 'border-green-200',
        featureText: 'text-green-700',
        featureTitle: 'text-green-800'
      };
    } else {
      return {
        title: 'Sign in as Collector',
        subtitle: 'Start earning money from waste collection',
        icon: Users,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        features: [
          'Accept collection requests in your area',
          'Set your own schedule and rates',
          'Professional tools and support',
          'Build your reputation and earn more'
        ],
        featureBg: 'bg-blue-50',
        featureBorder: 'border-blue-200',
        featureText: 'text-blue-700',
        featureTitle: 'text-blue-800'
      };
    }
  };

  const config = getPageConfig();
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to homepage
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 ${config.iconBg} rounded-full`}>
                <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {config.title}
            </h1>
            <p className="text-gray-600 mt-2">
              {config.subtitle}
            </p>
          </div>

          {/* Google Sign In */}
          <div className="space-y-6">
            <GoogleSignInButton userType={userType} />
            
            {/* Info */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>

            {/* Features */}
            <div className={`${config.featureBg} border ${config.featureBorder} rounded-lg p-4`}>
              <h3 className={`font-medium ${config.featureTitle} mb-2`}>
                {isDumper ? 'What you can do:' : 'Collector benefits:'}
              </h3>
              <ul className={`${config.featureText} text-sm space-y-1`}>
                {config.features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>

            {/* Switch User Type */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                {isDumper ? 'Want to earn money instead?' : 'Need waste collected instead?'}
              </p>
              <button
                onClick={() => navigate(isDumper ? '/auth/collector' : '/auth/dumper')}
                className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
              >
                {isDumper ? 'Become a Collector' : 'Request Collection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};