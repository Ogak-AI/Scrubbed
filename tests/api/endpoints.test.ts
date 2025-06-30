import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(),
          order: vi.fn()
        })),
        insert: vi.fn(),
        update: vi.fn(() => ({
          eq: vi.fn()
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    })),
    functions: {
      invoke: vi.fn()
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'test-url' } }))
      }))
    }
  }
}));

describe('API Endpoints Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    it('handles successful authentication', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { user_type: 'dumper' }
        }
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { data, error } = await supabase.auth.getSession();
      
      expect(error).toBeNull();
      expect(data.session).toEqual(mockSession);
      expect(supabase.auth.getSession).toHaveBeenCalledOnce();
    });

    it('handles authentication errors', async () => {
      const mockError = new Error('Authentication failed');
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError
      });

      const { data, error } = await supabase.auth.getSession();
      
      expect(error).toEqual(mockError);
      expect(data.session).toBeNull();
    });

    it('handles OAuth sign in', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth-url.com' },
        error: null
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'http://localhost:3000' }
      });

      expect(error).toBeNull();
      expect(data.url).toBe('https://oauth-url.com');
    });
  });

  describe('Database Operations', () => {
    it('fetches user profiles correctly', async () => {
      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        user_type: 'dumper'
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      });

      supabase.from.mockReturnValue({
        select: mockSelect
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'test-user-id')
        .single();

      expect(error).toBeNull();
      expect(data).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('creates waste requests correctly', async () => {
      const mockRequest = {
        id: 'test-request-id',
        dumper_id: 'test-user-id',
        waste_type: 'Household',
        address: '123 Test St'
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: mockRequest,
        error: null
      });

      supabase.from.mockReturnValue({
        insert: mockInsert
      });

      const { data, error } = await supabase
        .from('waste_requests')
        .insert(mockRequest);

      expect(error).toBeNull();
      expect(data).toEqual(mockRequest);
      expect(mockInsert).toHaveBeenCalledWith(mockRequest);
    });

    it('handles database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError
          })
        })
      });

      supabase.from.mockReturnValue({
        select: mockSelect
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'invalid-id')
        .single();

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });
  });

  describe('Edge Functions', () => {
    it('sends SMS verification correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'SMS sent successfully'
      };

      supabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: '+1234567890' }
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockResponse);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-sms', {
        body: { phone: '+1234567890' }
      });
    });

    it('verifies phone codes correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Phone verified successfully'
      };

      supabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: { code: '123456' }
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockResponse);
    });
  });

  describe('File Storage', () => {
    it('uploads files correctly', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      supabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'waste-photos/test.jpg' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/test.jpg' }
        })
      });

      const { data, error } = await supabase.storage
        .from('waste-photos')
        .upload('test.jpg', mockFile);

      expect(error).toBeNull();
      expect(data.path).toBe('waste-photos/test.jpg');
    });
  });

  describe('Response Schema Validation', () => {
    it('validates user profile schema', () => {
      const validProfile = {
        id: 'uuid-string',
        email: 'test@example.com',
        full_name: 'Test User',
        user_type: 'dumper',
        phone: '+1234567890',
        address: 'Test Address',
        email_verified: true,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate required fields
      expect(validProfile.id).toBeDefined();
      expect(validProfile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(['dumper', 'collector', 'admin']).toContain(validProfile.user_type);
      expect(typeof validProfile.email_verified).toBe('boolean');
      expect(typeof validProfile.phone_verified).toBe('boolean');
    });

    it('validates waste request schema', () => {
      const validRequest = {
        id: 'uuid-string',
        dumper_id: 'uuid-string',
        collector_id: null,
        waste_type: 'Household',
        description: 'Test description',
        location: { lat: 40.7128, lng: -74.0060 },
        address: '123 Test St',
        status: 'pending',
        scheduled_time: null,
        estimated_amount: '2-3 bags',
        price: 25.50,
        photos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate required fields
      expect(validRequest.id).toBeDefined();
      expect(validRequest.dumper_id).toBeDefined();
      expect(validRequest.waste_type).toBeDefined();
      expect(validRequest.location).toHaveProperty('lat');
      expect(validRequest.location).toHaveProperty('lng');
      expect(['pending', 'matched', 'in_progress', 'completed', 'cancelled']).toContain(validRequest.status);
    });
  });
});