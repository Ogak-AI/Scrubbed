import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { AppProvider } from '../../src/contexts/AppContext';
import { LandingPage } from '../../src/pages/LandingPage';
import { AuthPage } from '../../src/pages/AuthPage';
import { DumperDashboard } from '../../src/components/dumper/DumperDashboard';
import { CollectorDashboard } from '../../src/components/collector/CollectorDashboard';
import { AdminDashboard } from '../../src/components/admin/AdminDashboard';

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('UI Components Tests', () => {
  describe('Landing Page', () => {
    it('renders landing page correctly', () => {
      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );
      
      expect(screen.getByText('Smart Waste Management')).toBeInTheDocument();
      expect(screen.getByText('Made Simple')).toBeInTheDocument();
      expect(screen.getByText('Request Collection')).toBeInTheDocument();
      expect(screen.getByText('Become Collector')).toBeInTheDocument();
    });

    it('handles mobile menu toggle', async () => {
      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );
      
      // Find and click mobile menu button
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);
      
      // Check if mobile menu is visible
      await waitFor(() => {
        expect(screen.getByText('Request Collection')).toBeVisible();
      });
    });

    it('navigates to auth pages correctly', () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate
        };
      });

      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );
      
      const requestButton = screen.getByText('Request Collection');
      fireEvent.click(requestButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/auth/dumper');
    });
  });

  describe('Auth Page', () => {
    it('renders dumper auth page correctly', () => {
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useParams: () => ({ userType: 'dumper' })
        };
      });

      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );
      
      expect(screen.getByText('Sign in as Customer')).toBeInTheDocument();
      expect(screen.getByText('Get your waste collected by professionals')).toBeInTheDocument();
    });

    it('renders collector auth page correctly', () => {
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useParams: () => ({ userType: 'collector' })
        };
      });

      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );
      
      expect(screen.getByText('Sign in as Collector')).toBeInTheDocument();
      expect(screen.getByText('Start earning money from waste collection')).toBeInTheDocument();
    });
  });

  describe('Dashboard Components', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      userType: 'dumper' as const,
      phone: '+1234567890',
      address: '{"street":"123 Test St","city":"Test City","state":"TS","zipCode":"12345","country":"United States"}',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('renders dumper dashboard correctly', () => {
      vi.mock('../../src/hooks/useAuth', () => ({
        useAuth: () => ({
          user: { ...mockUser, userType: 'dumper' },
          signOut: vi.fn()
        })
      }));

      render(
        <TestWrapper>
          <DumperDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Welcome back, Test!')).toBeInTheDocument();
      expect(screen.getByText('New Request')).toBeInTheDocument();
    });

    it('renders collector dashboard correctly', () => {
      vi.mock('../../src/hooks/useAuth', () => ({
        useAuth: () => ({
          user: { ...mockUser, userType: 'collector' },
          signOut: vi.fn()
        })
      }));

      render(
        <TestWrapper>
          <CollectorDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Scrubbed Collector')).toBeInTheDocument();
      expect(screen.getByText('Available Requests')).toBeInTheDocument();
    });

    it('renders admin dashboard correctly', () => {
      vi.mock('../../src/hooks/useAuth', () => ({
        useAuth: () => ({
          user: { ...mockUser, userType: 'admin' },
          signOut: vi.fn()
        })
      }));

      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Tests', () => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 375, height: 667, name: 'Mobile Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];

    viewports.forEach(viewport => {
      it(`renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        render(
          <TestWrapper>
            <LandingPage />
          </TestWrapper>
        );
        
        // Check that essential elements are present
        expect(screen.getByText('Scrubbed')).toBeInTheDocument();
        expect(screen.getByText('Smart Waste Management')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );
      
      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check for proper navigation
      const navigation = screen.getByRole('banner');
      expect(navigation).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );
      
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });
});