/**
 * OnboardingWizard Component Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Step indicator with 4 steps
 * - Progress bar at 0%/25%/50%/75%/100%
 * - Pre-filled tenant info from invite
 * - Step validation before advancing
 * - Back navigation with data preservation
 * - Complete wizard and callback
 * - Skip payment step functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import OnboardingWizard from './OnboardingWizard';
import * as tenantAuthService from '../../services/tenantAuthService';

// Mock the auth service
vi.mock('../../services/tenantAuthService', () => ({
  updateTenantProfile: vi.fn(),
  completeOnboarding: vi.fn(),
  updateCommunicationPreferences: vi.fn(),
}));

describe('OnboardingWizard', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const defaultProps = {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    tenantEmail: 'tenant@example.com',
    propertyName: 'Test Property',
    unitName: 'Unit 101',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  const prefillData = {
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
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
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
      success: true,
      tenant: {} as any,
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
  // INITIAL RENDER
  // ============================================

  describe('Initial Render', () => {
    it('should render the wizard container', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
    });

    it('should show step indicator with 4 steps', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
      expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
    });

    it('should show step 1 title "Verify Info"', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /verify info/i })).toBeInTheDocument();
    });

    it('should show progress bar at 0%', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should pre-fill data from invite', () => {
      render(
        <OnboardingWizard {...defaultProps} initialData={prefillData} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('should show property name in header', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/test property/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // STEP 1: PERSONAL INFO
  // ============================================

  describe('Step 1: Personal Info', () => {
    it('should show first name input', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    it('should show last name input', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it('should show phone input', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      // Get by exact label (not emergency contact phone)
      expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    });

    it('should show email as readonly', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const emailInput = screen.getByDisplayValue('tenant@example.com');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('readonly');
    });

    it('should show emergency contact section', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      // Look for the heading specifically
      expect(screen.getByRole('heading', { name: /emergency contact/i })).toBeInTheDocument();
    });

    it('should validate required fields before advancing', async () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      // Try to advance without filling required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should show error
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    it('should advance to step 2 when form is valid', async () => {
      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // STEP 2: PAYMENT METHOD (SKIPPABLE)
  // ============================================

  describe('Step 2: Payment Method', () => {
    const goToStep2 = async () => {
      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      });
    };

    it('should show payment method step title', async () => {
      await goToStep2();

      expect(screen.getByRole('heading', { name: /payment method/i })).toBeInTheDocument();
    });

    it('should show skip option', async () => {
      await goToStep2();

      expect(screen.getByRole('button', { name: /skip.*later/i })).toBeInTheDocument();
    });

    it('should advance when skip is clicked', async () => {
      await goToStep2();

      const skipButton = screen.getByRole('button', { name: /skip.*later/i });
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
      });
    });

    it('should show back button', async () => {
      await goToStep2();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should show progress bar at 25%', async () => {
      await goToStep2();

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  // ============================================
  // STEP 3: NOTIFICATION PREFERENCES
  // ============================================

  describe('Step 3: Notification Preferences', () => {
    const goToStep3 = async () => {
      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      // Step 1 -> 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      });

      // Step 2 -> 3 (skip payment)
      const skipButton = screen.getByRole('button', { name: /skip.*later/i });
      await user.click(skipButton);
      await waitFor(() => {
        expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
      });
    };

    it('should show notification preferences step title', async () => {
      await goToStep3();

      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should show payment reminder toggle', async () => {
      await goToStep3();

      expect(screen.getByLabelText(/payment reminders/i)).toBeInTheDocument();
    });

    it('should show maintenance updates toggle', async () => {
      await goToStep3();

      expect(screen.getByLabelText(/maintenance updates/i)).toBeInTheDocument();
    });

    it('should show progress bar at 50%', async () => {
      await goToStep3();

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should advance to step 4 when next is clicked', async () => {
      await goToStep3();

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // STEP 4: REVIEW & ACCEPT
  // ============================================

  describe('Step 4: Review & Accept', () => {
    const goToStep4 = async () => {
      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      // Step 1 -> 2
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument());

      // Step 2 -> 3 (skip payment)
      await user.click(screen.getByRole('button', { name: /skip.*later/i }));
      await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument());

      // Step 3 -> 4
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument());
    };

    it('should show review step title', async () => {
      await goToStep4();

      expect(screen.getByRole('heading', { name: /review.*accept/i })).toBeInTheDocument();
    });

    it('should show terms checkbox', async () => {
      await goToStep4();

      expect(screen.getByLabelText(/terms.*service/i)).toBeInTheDocument();
    });

    it('should show privacy policy checkbox', async () => {
      await goToStep4();

      expect(screen.getByLabelText(/privacy policy/i)).toBeInTheDocument();
    });

    it('should show electronic signature consent checkbox', async () => {
      await goToStep4();

      expect(screen.getByLabelText(/electronic signature/i)).toBeInTheDocument();
    });

    it('should show progress bar at 75%', async () => {
      await goToStep4();

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should show complete button', async () => {
      await goToStep4();

      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });

    it('should require all checkboxes before completing', async () => {
      await goToStep4();

      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      // Should show error
      expect(screen.getByText(/please accept all terms/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // COMPLETE ONBOARDING
  // ============================================

  describe('Complete Onboarding', () => {
    const completeWizard = async () => {
      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      // Step 1 -> 2
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument());

      // Step 2 -> 3 (skip payment)
      await user.click(screen.getByRole('button', { name: /skip.*later/i }));
      await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument());

      // Step 3 -> 4
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument());

      // Accept all terms
      await user.click(screen.getByLabelText(/terms.*service/i));
      await user.click(screen.getByLabelText(/privacy policy/i));
      await user.click(screen.getByLabelText(/electronic signature/i));

      // Complete
      await user.click(screen.getByRole('button', { name: /complete/i }));
    };

    it('should call onComplete when wizard is completed', async () => {
      await completeWizard();

      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
      });
    });

    it('should call updateTenantProfile on completion', async () => {
      await completeWizard();

      await waitFor(() => {
        expect(tenantAuthService.updateTenantProfile).toHaveBeenCalled();
      });
    });

    it('should call completeOnboarding on completion', async () => {
      await completeWizard();

      await waitFor(() => {
        expect(tenantAuthService.completeOnboarding).toHaveBeenCalled();
      });
    });

    it('should show progress bar at 100% when complete', async () => {
      await completeWizard();

      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      });
    });

    it('should disable complete button while submitting', async () => {
      // Make the service call take time
      vi.mocked(tenantAuthService.completeOnboarding).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      // Navigate to step 4
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /skip.*later/i }));
      await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument());

      // Accept terms
      await user.click(screen.getByLabelText(/terms.*service/i));
      await user.click(screen.getByLabelText(/privacy policy/i));
      await user.click(screen.getByLabelText(/electronic signature/i));

      // Click complete
      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      // Button should be disabled
      expect(completeButton).toBeDisabled();
    });
  });

  // ============================================
  // BACK NAVIGATION
  // ============================================

  describe('Back Navigation', () => {
    it('should not show back button on step 1', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should preserve data when navigating back', async () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      // Fill in first name
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'Jane');

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(lastNameInput, 'Smith');

      const phoneInput = screen.getByLabelText(/^phone$/i);
      await user.type(phoneInput, '5559876543');

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
      });

      // Data should still be there
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    });
  });

  // ============================================
  // CANCEL FUNCTIONALITY
  // ============================================

  describe('Cancel Functionality', () => {
    it('should show cancel button', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onCancel when cancel is clicked', async () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should show error message when profile update fails', async () => {
      vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
        success: false,
        error: 'Failed to update profile',
      });

      render(<OnboardingWizard {...defaultProps} initialData={prefillData} />, {
        wrapper: createWrapper(),
      });

      // Navigate to step 4
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /skip.*later/i }));
      await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument());

      // Accept terms
      await user.click(screen.getByLabelText(/terms.*service/i));
      await user.click(screen.getByLabelText(/privacy policy/i));
      await user.click(screen.getByLabelText(/electronic signature/i));

      // Complete
      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('Accessibility', () => {
    it('should have aria-current on active step', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const activeStep = screen.getByTestId('step-1');
      expect(activeStep).toHaveAttribute('aria-current', 'step');
    });

    it('should have proper role on progress bar', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
    });

    it('should have aria-valuemin and aria-valuemax on progress bar', () => {
      render(<OnboardingWizard {...defaultProps} />, { wrapper: createWrapper() });

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
