/**
 * TenantOnboardingPage
 * Container page for the onboarding wizard
 * Handles authentication and redirect logic
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import OnboardingWizard from '../../components/tenant/OnboardingWizard';
import { getCurrentTenant, type Tenant } from '../../services/tenantAuthService';

export default function TenantOnboardingPage() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and onboarding status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentTenant = await getCurrentTenant();

        if (!currentTenant) {
          // Not authenticated - redirect to login
          navigate('/tenant/login');
          return;
        }

        if (currentTenant.portal_onboarding_completed) {
          // Already onboarded - redirect to dashboard
          navigate('/tenant/dashboard');
          return;
        }

        setTenant(currentTenant);
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/tenant/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Handle onboarding completion
  const handleComplete = () => {
    navigate('/tenant/dashboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
        <div data-testid="loading-state" className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-dark">Loading...</p>
        </div>
      </div>
    );
  }

  // No tenant (should redirect)
  if (!tenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-black mb-2">
            Complete Your Setup
          </h1>
          <p className="text-neutral-medium">
            Welcome, {tenant.first_name}! Let's get your account ready.
          </p>
        </div>

        {/* Onboarding Wizard */}
        <OnboardingWizard
          tenantId={tenant.id}
          tenantEmail={tenant.email}
          initialData={{
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            phone: tenant.phone || '',
            email: tenant.email,
          }}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
