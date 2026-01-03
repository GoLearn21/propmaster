/**
 * TenantSettingsPage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Loading state while fetching tenant data
 * - Redirect to login if not authenticated
 * - Display notification preferences
 * - Toggle notification preferences
 * - Save preferences
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import TenantSettingsPage from './TenantSettingsPage';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock services
vi.mock('../../services/tenantAuthService', () => ({
  getCurrentTenant: vi.fn(),
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

describe('TenantSettingsPage', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const mockTenant = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'tenant@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    portal_onboarding_completed: true,
    portal_access: true,
    status: 'active',
    balance_due: 0,
    communication_preferences: {
      email: true,
      sms: false,
      push: false,
      payment_reminders: true,
      maintenance_updates: true,
      lease_notifications: false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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
        <MemoryRouter initialEntries={['/tenant/settings']}>
          <Routes>
            <Route path="/tenant/settings" element={children} />
            <Route path="/tenant/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(mockTenant);
    vi.mocked(tenantAuthService.updateCommunicationPreferences).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // LOADING STATE
  // ============================================

  describe('Loading State', () => {
    it('should show loading state while fetching tenant data', () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  // ============================================
  // AUTHENTICATION
  // ============================================

  describe('Authentication', () => {
    it('should redirect to login if not authenticated', async () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(null);

      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tenant/login');
      });
    });
  });

  // ============================================
  // PAGE LAYOUT
  // ============================================

  describe('Page Layout', () => {
    it('should show page title', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
      });
    });

    it('should show notification preferences section', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /notification.*preferences/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // NOTIFICATION PREFERENCES DISPLAY
  // ============================================

  describe('Notification Preferences Display', () => {
    it('should show email notifications toggle', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
      });
    });

    it('should show payment reminders toggle', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /payment reminders/i })).toBeInTheDocument();
      });
    });

    it('should show maintenance updates toggle', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /maintenance updates/i })).toBeInTheDocument();
      });
    });

    it('should show lease notifications toggle', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /lease notifications/i })).toBeInTheDocument();
      });
    });

    it('should reflect current preferences state', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeChecked();
        expect(screen.getByRole('switch', { name: /payment reminders/i })).toBeChecked();
        expect(screen.getByRole('switch', { name: /maintenance updates/i })).toBeChecked();
        expect(screen.getByRole('switch', { name: /lease notifications/i })).not.toBeChecked();
      });
    });
  });

  // ============================================
  // TOGGLE PREFERENCES
  // ============================================

  describe('Toggle Preferences', () => {
    it('should toggle email notifications', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
      });

      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      await user.click(emailToggle);

      await waitFor(() => {
        expect(tenantAuthService.updateCommunicationPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            email: false,
          })
        );
      });
    });

    it('should toggle payment reminders', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /payment reminders/i })).toBeInTheDocument();
      });

      const paymentToggle = screen.getByRole('switch', { name: /payment reminders/i });
      await user.click(paymentToggle);

      await waitFor(() => {
        expect(tenantAuthService.updateCommunicationPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_reminders: false,
          })
        );
      });
    });

    it('should toggle maintenance updates', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /maintenance updates/i })).toBeInTheDocument();
      });

      const maintenanceToggle = screen.getByRole('switch', { name: /maintenance updates/i });
      await user.click(maintenanceToggle);

      await waitFor(() => {
        expect(tenantAuthService.updateCommunicationPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            maintenance_updates: false,
          })
        );
      });
    });

    it('should toggle lease notifications', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /lease notifications/i })).toBeInTheDocument();
      });

      const leaseToggle = screen.getByRole('switch', { name: /lease notifications/i });
      await user.click(leaseToggle);

      await waitFor(() => {
        expect(tenantAuthService.updateCommunicationPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            lease_notifications: true,
          })
        );
      });
    });
  });

  // ============================================
  // SAVE FEEDBACK
  // ============================================

  describe('Save Feedback', () => {
    it('should show success message after saving', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
      });

      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      await user.click(emailToggle);

      await waitFor(() => {
        expect(screen.getByText(/preferences.*saved/i)).toBeInTheDocument();
      });
    });

    it('should update toggle state after successful save', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /lease notifications/i })).not.toBeChecked();
      });

      const leaseToggle = screen.getByRole('switch', { name: /lease notifications/i });
      await user.click(leaseToggle);

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /lease notifications/i })).toBeChecked();
      });
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should show error message when save fails', async () => {
      vi.mocked(tenantAuthService.updateCommunicationPreferences).mockResolvedValue({
        success: false,
        error: 'Failed to update preferences',
      });

      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
      });

      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      await user.click(emailToggle);

      await waitFor(() => {
        expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
      });
    });

    it('should revert toggle state on save failure', async () => {
      vi.mocked(tenantAuthService.updateCommunicationPreferences).mockResolvedValue({
        success: false,
        error: 'Failed to update preferences',
      });

      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeChecked();
      });

      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      await user.click(emailToggle);

      // Should revert back to original state after failure
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeChecked();
      });
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible toggle labels', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // All toggles should have accessible names
        expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /payment reminders/i })).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /maintenance updates/i })).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /lease notifications/i })).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      render(<TenantSettingsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });
  });
});
