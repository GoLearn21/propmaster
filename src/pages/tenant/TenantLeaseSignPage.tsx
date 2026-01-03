/**
 * Tenant Lease Sign Page
 * Embedded DocuSeal signing experience with DocuSign-quality UX
 * Step-by-step guided signing flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LeaseSigningFlow, { PreSigningReview } from '../../components/tenant/LeaseSigningFlow';
import {
  getDocument,
  TenantDocument,
} from '../../services/tenant/tenantDocumentService';
import { getSigningUrl } from '../../services/tenant/docusealService';

type PageState = 'loading' | 'review' | 'signing' | 'error' | 'already_signed';

export default function TenantLeaseSignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useRequireTenantAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [document, setDocument] = useState<TenantDocument | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load document and signing URL
  useEffect(() => {
    async function loadSigningData() {
      if (!id || !tenant?.id) return;

      try {
        setPageState('loading');

        // Load document details
        const doc = await getDocument(id, tenant.id);
        if (!doc) {
          setError('Document not found');
          setPageState('error');
          return;
        }

        setDocument(doc);

        // Check if already signed
        if (doc.signing_request?.my_signer?.status === 'signed') {
          setPageState('already_signed');
          return;
        }

        // Check if signing is available
        if (!doc.signing_request) {
          setError('This document does not require signing');
          setPageState('error');
          return;
        }

        // Get signing URL
        const signingResult = await getSigningUrl(doc.signing_request.id, tenant.id);

        if (signingResult.success && signingResult.embedUrl) {
          setEmbedUrl(signingResult.embedUrl);
          setPageState('review');
        } else {
          setError(signingResult.error || 'Unable to load signing URL');
          setPageState('error');
        }
      } catch (err) {
        console.error('Error loading signing data:', err);
        setError('An unexpected error occurred');
        setPageState('error');
      }
    }

    loadSigningData();
  }, [id, tenant?.id]);

  // Handle proceed to signing
  const handleProceed = useCallback(() => {
    setPageState('signing');
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    navigate('/tenant/documents');
  }, [navigate]);

  // Handle signing complete
  const handleComplete = useCallback(() => {
    navigate('/tenant/documents?signed=true');
  }, [navigate]);

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-neutral-dark">Preparing your document...</p>
          <p className="text-sm text-neutral mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
            Unable to Load Document
          </h2>
          <p className="text-neutral-dark mb-6">
            {error || 'An error occurred while loading the signing page.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/tenant/documents')}
            >
              Back to Documents
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Already signed state
  if (pageState === 'already_signed') {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
            Already Signed
          </h2>
          <p className="text-neutral-dark mb-6">
            You have already signed this document on{' '}
            {document?.signing_request?.my_signer?.signed_at
              ? new Date(document.signing_request.my_signer.signed_at).toLocaleDateString()
              : 'a previous date'}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/tenant/documents/${id}`)}
            >
              View Document
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/tenant/documents')}
            >
              Back to Documents
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Pre-signing review state
  if (pageState === 'review' && document) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        {/* Back button */}
        <button
          onClick={handleCancel}
          className="fixed top-4 left-4 flex items-center gap-2 text-neutral hover:text-neutral-dark transition-colors z-10"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Cancel</span>
        </button>

        <PreSigningReview
          documentName={document.name}
          propertyName={document.property?.name}
          leaseTerms={undefined} // TODO: Pass actual lease terms when available
          onProceed={handleProceed}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // Active signing flow
  if (pageState === 'signing' && document && embedUrl && tenant) {
    return (
      <LeaseSigningFlow
        embedUrl={embedUrl}
        documentName={document.name}
        leaseId={id!}
        tenantId={tenant.id}
        tenantEmail={tenant.email}
        propertyName={document.property?.name}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  // Fallback
  return null;
}

/**
 * Direct signing page without document context
 * Used when navigating directly from a signing link
 */
interface DirectSigningPageProps {
  embedUrl: string;
  documentName?: string;
  onComplete?: () => void;
}

export function DirectSigningPage({
  embedUrl,
  documentName = 'Document',
  onComplete,
}: DirectSigningPageProps) {
  const { tenant } = useRequireTenantAuth();
  const navigate = useNavigate();

  const handleComplete = useCallback(() => {
    onComplete?.();
    navigate('/tenant/documents?signed=true');
  }, [onComplete, navigate]);

  const handleCancel = useCallback(() => {
    if (window.confirm('Are you sure you want to exit? Your progress will not be saved.')) {
      navigate('/tenant/documents');
    }
  }, [navigate]);

  if (!tenant) {
    return null;
  }

  return (
    <LeaseSigningFlow
      embedUrl={embedUrl}
      documentName={documentName}
      leaseId=""
      tenantId={tenant.id}
      tenantEmail={tenant.email}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
