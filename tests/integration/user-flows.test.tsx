import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock the auth context
const mockAuthContext = {
  user: null,
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn()
};

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext
}));

describe('User Flow Integration Tests', () => {
  const user = userEvent.setup();

  describe('Complete User Registration Flow', () => {
    it('allows user to sign up as dumper and complete profile', async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // 1. User lands on homepage
      expect(screen.getByText('Smart Waste Management')).toBeInTheDocument();

      // 2. User clicks "Request Collection"
      const requestButton = screen.getByText('Request Collection');
      await user.click(requestButton);

      // 3. User should be on auth page
      await waitFor(() => {
        expect(screen.getByText('Sign in as Customer')).toBeInTheDocument();
      });

      // 4. User clicks Google sign in
      const googleButton = screen.getByText(/Continue with Google/);
      await user.click(googleButton);

      expect(mockAuthContext.signInWithGoogle).toHaveBeenCalledWith('dumper');
    });

    it('allows user to sign up as collector and complete profile', async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // 1. User clicks "Become Collector"
      const collectorButton = screen.getByText('Become Collector');
      await user.click(collectorButton);

      // 2. User should be on collector auth page
      await waitFor(() => {
        expect(screen.getByText('Sign in as Collector')).toBeInTheDocument();
      });

      // 3. User clicks Google sign in
      const googleButton = screen.getByText(/Continue with Google/);
      await user.click(googleButton);

      expect(mockAuthContext.signInWithGoogle).toHaveBeenCalledWith('collector');
    });
  });

  describe('Waste Request Creation Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'dumper',
        phone: '+1234567890',
        address: '{"street":"123 Test St","city":"Test City","state":"TS","zipCode":"12345","country":"United States"}',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    it('allows authenticated dumper to create waste request', async () => {
      // Mock the hooks
      vi.mock('../../src/hooks/useWasteRequests', () => ({
        useWasteRequests: () => ({
          requests: [],
          loading: false,
          error: null,
          createRequest: vi.fn().mockResolvedValue({ id: 'new-request' })
        })
      }));

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // User should see dashboard
      await waitFor(() => {
        expect(screen.getByText('Welcome back, Test!')).toBeInTheDocument();
      });

      // Click "New Request" button
      const newRequestButton = screen.getByText('New Request');
      await user.click(newRequestButton);

      // Should see request form
      await waitFor(() => {
        expect(screen.getByText('New Collection Request')).toBeInTheDocument();
      });

      // Fill out form
      const wasteTypeSelect = screen.getByDisplayValue('Select waste type');
      await user.selectOptions(wasteTypeSelect, 'Household');

      const addressInput = screen.getByPlaceholderText('Enter pickup address');
      await user.clear(addressInput);
      await user.type(addressInput, '456 New Address St');

      const descriptionInput = screen.getByPlaceholderText('Describe the waste items (optional)');
      await user.type(descriptionInput, 'Old furniture and boxes');

      // Submit form
      const submitButton = screen.getByText('Create Request');
      await user.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Request Created!')).toBeInTheDocument();
      });
    });
  });

  describe('Collector Job Acceptance Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'collector-user',
        email: 'collector@example.com',
        fullName: 'Collector User',
        userType: 'collector',
        phone: '+1234567890',
        address: '{"street":"789 Collector St","city":"Test City","state":"TS","zipCode":"12345","country":"United States"}',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    it('allows collector to view and accept requests', async () => {
      // Mock available requests
      vi.mock('../../src/hooks/useWasteRequests', () => ({
        useWasteRequests: () => ({
          requests: [
            {
              id: 'test-request',
              dumperId: 'dumper-user',
              collectorId: null,
              wasteType: 'Household',
              description: 'Old furniture',
              location: { lat: 40.7128, lng: -74.0060 },
              address: '123 Test St',
              status: 'pending',
              scheduledTime: null,
              estimatedAmount: '2-3 bags',
              price: null,
              photos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          loading: false,
          error: null,
          acceptRequest: vi.fn().mockResolvedValue(true)
        })
      }));

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should see collector dashboard
      await waitFor(() => {
        expect(screen.getByText('Scrubbed Collector')).toBeInTheDocument();
      });

      // Should see available request
      expect(screen.getByText('Household Waste')).toBeInTheDocument();
      expect(screen.getByText('Old furniture')).toBeInTheDocument();

      // Click accept button
      const acceptButton = screen.getByText('Accept Request');
      await user.click(acceptButton);

      // Request should be accepted (mocked)
      expect(screen.getByText('Accept Request')).toBeInTheDocument();
    });
  });

  describe('Profile Management Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'dumper',
        phone: '+1234567890',
        address: '{"street":"123 Test St","city":"Test City","state":"TS","zipCode":"12345","country":"United States"}',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    it('allows user to update profile information', async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Open profile menu
      const profileButton = screen.getByRole('button', { name: /Test User/i });
      await user.click(profileButton);

      // Click profile settings
      const settingsButton = screen.getByText('Profile Settings');
      await user.click(settingsButton);

      // Should see profile settings page
      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      // Update name
      const nameInput = screen.getByDisplayValue('Test');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(mockAuthContext.updateProfile).toHaveBeenCalled();
    });
  });

  describe('Error Handling Flows', () => {
    it('handles network errors gracefully', async () => {
      // Mock network error
      vi.mock('../../src/hooks/useWasteRequests', () => ({
        useWasteRequests: () => ({
          requests: [],
          loading: false,
          error: 'Network error: Failed to fetch requests',
          createRequest: vi.fn()
        })
      }));

      mockAuthContext.user = {
        id: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'dumper',
        phone: '+1234567890',
        address: '123 Test St',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', async () => {
      mockAuthContext.signInWithGoogle.mockRejectedValue(new Error('Authentication failed'));

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Navigate to auth page
      const requestButton = screen.getByText('Request Collection');
      await user.click(requestButton);

      // Try to sign in
      const googleButton = screen.getByText(/Continue with Google/);
      await user.click(googleButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockAuthContext.signInWithGoogle).toHaveBeenCalled();
      });
    });
  });

  describe('Mobile Responsive Flows', () => {
    it('handles mobile navigation correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should see mobile menu button
      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      // Open mobile menu
      await user.click(menuButton);

      // Should see mobile menu items
      await waitFor(() => {
        expect(screen.getByText('Request Collection')).toBeVisible();
      });
    });
  });
});