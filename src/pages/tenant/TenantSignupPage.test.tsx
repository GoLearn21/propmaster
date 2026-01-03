/**
 * TenantSignupPage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Reading invite code from URL params
 * - Loading state during validation
 * - Pre-filled email (readonly)
 * - Password strength validation
 * - Confirm password matching
 * - Signup submission
 * - Redirect to onboarding on success
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import TenantSignupPage from './TenantSignupPage';
import * as tenantInviteService from '../../services/tenant/tenantInviteService';
import * as tenantAuthService from '../../services/tenantAuthService';
import type { InviteValidationResult } from '../../types/tenant-onboarding';

// Mock services
vi.mock('../../services/tenant/tenantInviteService', () => ({
  validateInviteCode: vi.fn(),
}));

vi.mock('../../services/tenantAuthService', () => ({
  signupTenant: vi.fn(),
  loginTenant: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TenantSignupPage', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const validInviteCode = 'a'.repeat(64);
  const validInvite: InviteValidationResult = {
    valid: true,
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'tenant@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    property_id: 'prop-123',
    unit_id: 'unit-456',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const createWrapper = (inviteCode: string = validInviteCode) => {
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
        <MemoryRouter initialEntries={[`/tenant/signup/${inviteCode}`]}>
          <Routes>
            <Route path="/tenant/signup/:inviteCode" element={children} />
            <Route path="/tenant/signup" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantInviteService.validateInviteCode).mockResolvedValue(validInvite);
    vi.mocked(tenantAuthService.signupTenant).mockResolvedValue({
      success: true,
      user: { id: 'user-123' } as any,
      tenant: {} as any,
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // INVITE CODE VALIDATION
  // ============================================

  describe('Invite Code Validation', () => {
    it('should read invite code from URL params', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(tenantInviteService.validateInviteCode).toHaveBeenCalledWith(validInviteCode);
      });
    });

    it('should show loading state while validating', () => {
      vi.mocked(tenantInviteService.validateInviteCode).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('should show error for invalid invite code', async () => {
      vi.mocked(tenantInviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'INVALID_CODE',
      });

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/invalid.*link/i)).toBeInTheDocument();
      });
    });

    it('should show error for expired invite', async () => {
      vi.mocked(tenantInviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'EXPIRED',
      });

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /expired/i })).toBeInTheDocument();
      });
    });

    it('should show error for already used invite', async () => {
      vi.mocked(tenantInviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'ALREADY_USED',
      });

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /already used/i })).toBeInTheDocument();
      });
    });

    it('should show error when no invite code is provided', async () => {
      const WrapperWithoutCode = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/tenant/signup']}>
            <Routes>
              <Route path="/tenant/signup/:inviteCode?" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(<TenantSignupPage />, { wrapper: WrapperWithoutCode });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /invite code required/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SIGNUP FORM
  // ============================================

  describe('Signup Form', () => {
    it('should show pre-filled email (readonly)', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('tenant@example.com');
        expect(emailInput).toBeInTheDocument();
        expect(emailInput).toHaveAttribute('readonly');
      });
    });

    it('should show password input', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });
    });

    it('should show confirm password input', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      });
    });

    it('should show password requirements', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show signup button', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // PASSWORD VALIDATION
  // ============================================

  describe('Password Validation', () => {
    it('should validate password minimum length', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'Short1!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password has uppercase', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'lowercase123!');

      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    it('should validate password has number', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'NoNumbers!@');

      expect(screen.getByText(/number/i)).toBeInTheDocument();
    });

    it('should validate password has special character', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'NoSpecial123');

      expect(screen.getByText(/special character/i)).toBeInTheDocument();
    });

    it('should show password strength indicator', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'StrongPass123!');

      expect(screen.getByTestId('password-strength')).toBeInTheDocument();
    });

    it('should validate passwords match', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SIGNUP SUBMISSION
  // ============================================

  describe('Signup Submission', () => {
    const fillValidForm = async () => {
      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'StrongPass123!');
    };

    it('should call signupTenant with correct data', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(tenantAuthService.signupTenant).toHaveBeenCalledWith(
          'tenant@example.com',
          'StrongPass123!',
          'John', // first_name from invite
          'Doe',  // last_name from invite
          validInviteCode
        );
      });
    });

    it('should show loading state while submitting', async () => {
      vi.mocked(tenantAuthService.signupTenant).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should redirect to onboarding on success', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tenant/onboarding');
      });
    });

    it('should show error on signup failure', async () => {
      vi.mocked(tenantAuthService.signupTenant).mockResolvedValue({
        success: false,
        error: 'Email already registered',
      });

      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // UI ELEMENTS
  // ============================================

  describe('UI Elements', () => {
    it('should show welcome message with tenant name', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/welcome.*john/i)).toBeInTheDocument();
      });
    });

    it('should show link to login page', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      });
    });

    it('should show toggle for password visibility', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      // There are 2 toggle buttons - one for each password field
      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('should toggle password visibility', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click first toggle button (for password field)
      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      await user.click(toggleButtons[0]);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible form labels', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should associate errors with inputs', async () => {
      render(<TenantSignupPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/passwords.*match/i);
        expect(errorMessage).toBeInTheDocument();
        // The error should have an aria-describedby relationship
        expect(confirmInput).toHaveAttribute('aria-describedby');
      });
    });
  });
});
