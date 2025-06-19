import React, { useState } from 'react';
import { Trash2, MapPin, CheckCircle, Truck, Shield, Star, AlertCircle } from 'lucide-react';
import { WASTE_TYPES } from '../../types';

interface CollectorOnboardingProps {
  onComplete: (profileData: any) => void;
}

export const CollectorOnboarding: React.FC<CollectorOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    specializations: [] as string[],
    serviceRadius: 10,
    vehicleType: '',
    experience: '',
    certifications: [] as string[],
    availability: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '15:00', available: true },
      sunday: { start: '10:00', end: '14:00', available: false },
    },
  });

  const handleSpecializationToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(type)
        ? prev.specializations.filter(s => s !== type)
        : [...prev.specializations, type]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (formData.specializations.length === 0) {
        throw new Error('Please select at least one specialization');
      }
      if (!formData.vehicleType || !formData.experience) {
        throw new Error('Please complete all required fields');
      }

      await onComplete(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to create collector profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Trash2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Scrubbed Collector</h2>
        <p className="text-gray-600">Let's set up your collector profile to start earning money from waste collection.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">What you'll get:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Access to waste collection requests in your area</li>
          <li>• Flexible scheduling and earnings</li>
          <li>• Professional tools and support</li>
          <li>• Customer ratings and reviews system</li>
        </ul>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        Get Started
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Specializations</h2>
        <p className="text-gray-600">Select the types of waste you can collect and handle professionally.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {WASTE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleSpecializationToggle(type)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              formData.specializations.includes(type)
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{type}</span>
              {formData.specializations.includes(type) && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep(1)}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={formData.specializations.length === 0}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Details</h2>
        <p className="text-gray-600">Tell us about your service area and equipment.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Service Radius (miles)
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="range"
            min="5"
            max="50"
            value={formData.serviceRadius}
            onChange={(e) => setFormData({ ...formData, serviceRadius: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>5 miles</span>
            <span className="font-medium">{formData.serviceRadius} miles</span>
            <span>50 miles</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vehicle Type *
        </label>
        <select
          value={formData.vehicleType}
          onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select your vehicle</option>
          <option value="pickup_truck">Pickup Truck</option>
          <option value="van">Van</option>
          <option value="box_truck">Box Truck</option>
          <option value="dump_truck">Dump Truck</option>
          <option value="trailer">Trailer</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Experience Level *
        </label>
        <select
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select experience level</option>
          <option value="beginner">Beginner (0-1 years)</option>
          <option value="intermediate">Intermediate (1-3 years)</option>
          <option value="experienced">Experienced (3-5 years)</option>
          <option value="expert">Expert (5+ years)</option>
        </select>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep(2)}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={!formData.vehicleType || !formData.experience}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Complete!</h2>
        <p className="text-gray-600">Your collector profile is ready. You can start accepting collection requests.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-3">Your Profile Summary:</h3>
        <div className="space-y-2 text-green-700 text-sm">
          <div className="flex items-center">
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Specializations: {formData.specializations.join(', ')}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            <span>Service Radius: {formData.serviceRadius} miles</span>
          </div>
          <div className="flex items-center">
            <Truck className="h-4 w-4 mr-2" />
            <span>Vehicle: {formData.vehicleType.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 mr-2" />
            <span>Experience: {formData.experience}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Next Steps:</h3>
        <ol className="text-blue-700 text-sm space-y-1">
          <li>1. Browse available collection requests</li>
          <li>2. Accept requests that match your specializations</li>
          <li>3. Complete collections and earn money</li>
          <li>4. Build your reputation with customer ratings</li>
        </ol>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Creating Profile...
          </div>
        ) : (
          'Start Collecting'
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Step {step} of 4</span>
              <span className="text-sm font-medium text-gray-600">{Math.round((step / 4) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};