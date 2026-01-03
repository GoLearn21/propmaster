/**
 * TenantResetPasswordPage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Password input
 * - Confirm password input
 * - Password strength validation
 * - Confirm password matching
 * - Submit button
 * - Loading state
 * - Success redirect
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import TenantResetPasswordPage from './TenantResetPasswordPage';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock services
vi.mock('../../services/tenantAuthService', () => ({
  updatePassword: vi.fn(),
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

describe('TenantResetPasswordPage', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

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
        <MemoryRouter initialEntries={['/tenant/reset-password']}>
          <Routes>
            <Route path="/tenant/reset-password" element={children} />
            <Route path="/tenant/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.updatePassword).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // PAGE LAYOUT
  // ============================================

  describe('Page Layout', () => {
    it('should show page title', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    });

    it('should show description text', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/enter.*new password/i)).toBeInTheDocument();
    });

    it('should show password input', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    it('should show confirm password input', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });

    it('should show submit button', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  // ============================================
  // PASSWORD VALIDATION
  // ============================================

  describe('Password Validation', () => {
    it('should validate password minimum length', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      await user.type(passwordInput, 'Short1!');

      expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
    });

    it('should validate password has uppercase', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      await user.type(passwordInput, 'lowercase123!');

      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    it('should validate password has number', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      await user.type(passwordInput, 'NoNumbers!@');

      expect(screen.getByText(/number/i)).toBeInTheDocument();
    });

    it('should validate password has special character', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      await user.type(passwordInput, 'NoSpecial123');

      expect(screen.getByText(/special character/i)).toBeInTheDocument();
    });

    it('should show password strength indicator', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      await user.type(passwordInput, 'StrongPass123!');

      expect(screen.getByTestId('password-strength')).toBeInTheDocument();
    });

    it('should validate passwords match', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      const confirmInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SUBMIT
  // ============================================

  describe('Submit', () => {
    const fillValidForm = async () => {
      const passwordInput = screen.getByLabelText(/^new password$/i);
      const confirmInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'StrongPass123!');
    };

    it('should call updatePassword with new password', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(tenantAuthService.updatePassword).toHaveBeenCalledWith('StrongPass123!');
      });
    });

    it('should show loading state while submitting', async () => {
      vi.mocked(tenantAuthService.updatePassword).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();
      });
    });

    it('should show success message after successful reset', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password.*reset.*successfully/i)).toBeInTheDocument();
      });
    });

    it('should show link to login after success', async () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      await fillValidForm();

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should show error message when reset fails', async () => {
      vi.mocked(tenantAuthService.updatePassword).mockResolvedValue({
        success: false,
        error: 'Failed to reset password',
      });

      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      const confirmInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'StrongPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to reset/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      vi.mocked(tenantAuthService.updatePassword).mockResolvedValue({
        success: false,
        error: 'Failed to reset password',
      });

      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText(/^new password$/i);
      const confirmInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(passwordInput, 'StrongPass123!');
      await user.type(confirmInput, 'StrongPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to reset/i)).toBeInTheDocument();
      });

      // Button should still be enabled for retry
      expect(screen.getByRole('button', { name: /reset password/i })).not.toBeDisabled();
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should show toggle for password visibility', () => {
      render(<TenantResetPasswordPage />, { wrapper: createWrapper() });

      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });
});
