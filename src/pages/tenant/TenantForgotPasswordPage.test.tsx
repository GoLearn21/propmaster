/**
 * TenantForgotPasswordPage Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Email input
 * - Email validation
 * - Submit button
 * - Loading state
 * - Success message
 * - Error handling
 * - Link to login page
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import TenantForgotPasswordPage from './TenantForgotPasswordPage';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock services
vi.mock('../../services/tenantAuthService', () => ({
  resetPassword: vi.fn(),
}));

describe('TenantForgotPasswordPage', () => {
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
        <MemoryRouter initialEntries={['/tenant/forgot-password']}>
          <Routes>
            <Route path="/tenant/forgot-password" element={children} />
            <Route path="/tenant/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.resetPassword).mockResolvedValue({
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
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    });

    it('should show description text', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/enter.*email.*reset/i)).toBeInTheDocument();
    });

    it('should show email input', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should show submit button', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should show link to login page', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  describe('Email Validation', () => {
    it('should validate email is required', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // SUBMIT
  // ============================================

  describe('Submit', () => {
    it('should call resetPassword with email', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(tenantAuthService.resetPassword).toHaveBeenCalledWith('tenant@example.com');
      });
    });

    it('should show loading state while submitting', async () => {
      vi.mocked(tenantAuthService.resetPassword).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
      });
    });

    it('should show success message after successful submit', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should show instructions after successful submit', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/sent.*link/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should show error message when request fails', async () => {
      vi.mocked(tenantAuthService.resetPassword).mockResolvedValue({
        success: false,
        error: 'Failed to send reset email',
      });

      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to send/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      vi.mocked(tenantAuthService.resetPassword).mockResolvedValue({
        success: false,
        error: 'Failed to send reset email',
      });

      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'tenant@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to send/i)).toBeInTheDocument();
      });

      // Button should still be enabled for retry
      expect(screen.getByRole('button', { name: /send reset link/i })).not.toBeDisabled();
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should associate error with input', async () => {
      render(<TenantForgotPasswordPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-describedby');
      });
    });
  });
});
