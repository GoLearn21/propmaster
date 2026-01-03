/**
 * New Maintenance Request Page
 * Allows tenants to submit new maintenance requests
 * Uses multi-step form wizard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import MaintenanceRequestForm, {
  MaintenanceFormData,
} from '../../components/tenant/MaintenanceRequestForm';
import {
  createMaintenanceRequest,
  uploadMaintenanceImages,
} from '../../services/tenant/tenantMaintenanceService';

type PageState = 'form' | 'submitting' | 'success' | 'error';

export default function TenantMaintenanceNewPage() {
  const { tenant, lease } = useRequireTenantAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('form');
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string>('');

  /**
   * Handle form submission
   */
  async function handleSubmit(formData: MaintenanceFormData) {
    if (!tenant || !lease) {
      setErrorMessage('Unable to submit request. Please try again.');
      setPageState('error');
      return;
    }

    setPageState('submitting');
    setSubmitProgress('Creating maintenance request...');

    try {
      // Create the maintenance request
      const result = await createMaintenanceRequest(tenant.id, lease.id, {
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        entry_permission: formData.entryPermission,
        preferred_time: formData.preferredTime,
        tenant_notes: formData.additionalNotes,
      });

      if (!result.success || !result.request) {
        throw new Error(result.error || 'Failed to create maintenance request');
      }

      const requestId = result.request.id;

      // Upload images if any
      if (formData.images.length > 0) {
        setSubmitProgress(`Uploading ${formData.images.length} photo${formData.images.length !== 1 ? 's' : ''}...`);

        const files = formData.images.map((img) => img.file);
        const uploadResult = await uploadMaintenanceImages(requestId, tenant.id, files);

        if (!uploadResult.success) {
          // Request was created but images failed - still consider it a success
          console.error('Image upload failed:', uploadResult.error);
        }
      }

      setCreatedRequestId(requestId);
      setPageState('success');
    } catch (err) {
      console.error('Error submitting maintenance request:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setPageState('error');
    }
  }

  /**
   * Reset form to try again
   */
  function handleRetry() {
    setPageState('form');
    setErrorMessage(null);
    setSubmitProgress('');
  }

  // Success State
  if (pageState === 'success' && createdRequestId) {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>

            <h1 className="text-2xl font-bold text-neutral-darkest mb-2">
              Request Submitted!
            </h1>
            <p className="text-neutral-dark mb-6">
              Your maintenance request has been submitted successfully.
              Our team will review it and get back to you soon.
            </p>

            <div className="bg-neutral-lightest rounded-lg p-4 mb-6">
              <p className="text-sm text-neutral mb-1">Request ID</p>
              <p className="font-mono text-neutral-darkest">
                {createdRequestId.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="text-sm text-neutral mb-6">
              <p>What happens next:</p>
              <ul className="mt-2 space-y-1 text-left max-w-xs mx-auto">
                <li>• Our team reviews your request</li>
                <li>• A technician is assigned (if needed)</li>
                <li>• You'll receive updates via notification</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate(`/tenant/maintenance/${createdRequestId}`)}
              >
                View Request Details
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/tenant/maintenance')}
              >
                Back to Maintenance
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Submitting State
  if (pageState === 'submitting') {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>

            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Submitting Request
            </h2>
            <p className="text-neutral-dark">
              {submitProgress || 'Please wait...'}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 mb-6">
              <span className="text-3xl">⚠️</span>
            </div>

            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Submission Failed
            </h2>
            <p className="text-neutral-dark mb-6">
              {errorMessage || 'An error occurred while submitting your request.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={handleRetry}>
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/tenant/maintenance')}
              >
                Back to Maintenance
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Form State (default)
  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/tenant/maintenance"
            className="inline-flex items-center text-sm text-neutral hover:text-neutral-dark transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Maintenance
          </Link>
          <h1 className="text-2xl font-bold text-neutral-darkest">
            New Maintenance Request
          </h1>
          <p className="text-neutral-dark mt-1">
            Tell us about the issue and we'll get it fixed
          </p>
        </div>

        {/* Form */}
        <MaintenanceRequestForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/tenant/maintenance')}
        />
      </div>
    </div>
  );
}
