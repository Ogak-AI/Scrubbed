// Test setup and configuration
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
  
  // Mock environment variables for testing
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
  
  // Mock geolocation API
  global.navigator.geolocation = {
    getCurrentPosition: vi.fn((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: Date.now()
      });
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
  };
  
  // Mock localStorage
  global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  
  // Mock fetch for API calls
  global.fetch = vi.fn();
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up DOM after each test
  cleanup();
});