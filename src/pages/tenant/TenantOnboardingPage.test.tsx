/**
 * TenantOnboardingPage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Authentication requirement
 * - Redirect if already onboarded
 * - OnboardingWizard integration
 * - Completion redirect to dashboard
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import TenantOnboardingPage from './TenantOnboardingPage';
import { TenantAuthProvider } from '../../contexts/TenantAuthContext';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock services
vi.mock('../../services/tenantAuthService', () => ({
  getCurrentTenant: vi.fn(),
  updateTenantProfile: vi.fn(),
  completeOnboarding: vi.fn(),
  updateCommunicationPreferences: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TenantOnboardingPage', () => {
  let queryClient: QueryClient;

  const mockTenant = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'tenant@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    portal_onboarding_completed: false,
    property_id: 'prop-123',
    unit_id: 'unit-456',
  };

  const mockOnboardedTenant = {
    ...mockTenant,
    portal_onboarding_completed: true,
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tenant/onboarding']}>
          <Routes>
            <Route path="/tenant/onboarding" element={children} />
            <Route path="/tenant/dashboard" element={<div>Dashboard</div>} />
            <Route path="/tenant/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(mockTenant);
    vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
      success: true,
      tenant: mockTenant as any,
    });
    vi.mocked(tenantAuthService.completeOnboarding).mockResolvedValue({
      success: true,
    });
    vi.mocked(tenantAuthService.updateCommunicationPreferences).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // AUTHENTICATION
  // ============================================

  describe('Authentication', () => {
    it('should show loading state while checking auth', () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('should redirect to login if not authenticated', async () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(null);

      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tenant/login');
      });
    });

    it('should show onboarding wizard when authenticated', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ALREADY ONBOARDED
  // ============================================

  describe('Already Onboarded', () => {
    it('should redirect to dashboard if already onboarded', async () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(mockOnboardedTenant);

      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tenant/dashboard');
      });
    });
  });

  // ============================================
  // ONBOARDING WIZARD
  // ============================================

  describe('Onboarding Wizard', () => {
    it('should pass tenant data to wizard', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
      });

      // Should show pre-filled name from tenant
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('should show step indicator', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
      });
    });

    it('should show progress bar', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // PAGE LAYOUT
  // ============================================

  describe('Page Layout', () => {
    it('should show page title', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /complete.*setup/i })).toBeInTheDocument();
      });
    });

    it('should show welcome message with tenant name', async () => {
      render(<TenantOnboardingPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/john/i)).toBeInTheDocument();
      });
    });
  });
});
