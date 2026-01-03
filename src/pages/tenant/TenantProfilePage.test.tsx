/**
 * TenantProfilePage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Loading state while fetching tenant data
 * - Redirect to login if not authenticated
 * - Display current profile information
 * - Edit mode toggle
 * - Form validation
 * - Save profile changes
 * - Error handling
 * - Cancel editing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import TenantProfilePage from './TenantProfilePage';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock services
vi.mock('../../services/tenantAuthService', () => ({
  getCurrentTenant: vi.fn(),
  updateTenantProfile: vi.fn(),
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

describe('TenantProfilePage', () => {
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
      lease_notifications: true,
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
        <MemoryRouter initialEntries={['/tenant/profile']}>
          <Routes>
            <Route path="/tenant/profile" element={children} />
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
      tenant: mockTenant,
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

      render(<TenantProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  // ============================================
  // AUTHENTICATION
  // ============================================

  describe('Authentication', () => {
    it('should redirect to login if not authenticated', async () => {
      vi.mocked(tenantAuthService.getCurrentTenant).mockResolvedValue(null);

      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tenant/login');
      });
    });
  });

  // ============================================
  // PROFILE DISPLAY
  // ============================================

  describe('Profile Display', () => {
    it('should show page title', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
      });
    });

    it('should display tenant first name', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('should display tenant last name', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Doe')).toBeInTheDocument();
      });
    });

    it('should display tenant email', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('tenant@example.com')).toBeInTheDocument();
      });
    });

    it('should display tenant phone', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/555.*123.*4567/)).toBeInTheDocument();
      });
    });

    it('should show edit button', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // EDIT MODE
  // ============================================

  describe('Edit Mode', () => {
    it('should switch to edit mode when edit button clicked', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      // In edit mode, should show form inputs
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('should pre-fill form with current values', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5551234567')).toBeInTheDocument();
    });

    it('should show save button in edit mode', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should show cancel button in edit mode', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show email as readonly in edit mode', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const emailInput = screen.getByDisplayValue('tenant@example.com');
      expect(emailInput).toHaveAttribute('readonly');
    });
  });

  // ============================================
  // FORM VALIDATION
  // ============================================

  describe('Form Validation', () => {
    it('should validate first name is required', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/first name.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate last name is required', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.clear(lastNameInput);
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/last name.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate phone format', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, 'invalid');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid phone/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SAVE CHANGES
  // ============================================

  describe('Save Changes', () => {
    it('should call updateTenantProfile with form data', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(tenantAuthService.updateTenantProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'Jane',
          })
        );
      });
    });

    it('should show loading state while saving', async () => {
      vi.mocked(tenantAuthService.updateTenantProfile).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });
    });

    it('should show success message after saving', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/profile.*updated/i)).toBeInTheDocument();
      });
    });

    it('should exit edit mode after successful save', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        // Should be back in display mode with edit button visible
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // CANCEL EDITING
  // ============================================

  describe('Cancel Editing', () => {
    it('should exit edit mode when cancel clicked', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should discard changes when cancel clicked', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should still show original name
      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should show error message when save fails', async () => {
      vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
        success: false,
        error: 'Failed to update profile',
      });

      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
      });
    });

    it('should stay in edit mode when save fails', async () => {
      vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
        success: false,
        error: 'Failed to update profile',
      });

      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        // Should still be in edit mode with save button visible
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible form labels in edit mode', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      render(<TenantProfilePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });
  });
});
