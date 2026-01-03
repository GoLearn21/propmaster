/**
 * Lease Signing Flow Component
 * Wrapper for DocuSeal embedded signing with enhanced UX
 * Provides DocuSign-quality step-by-step signing experience
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileSignature,
  AlertCircle,
  Loader2,
  X,
  HelpCircle,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import SignatureProgressBar, { SigningComplete } from './SignatureProgressBar';
import {
  getDocuSealEmbedConfig,
  handleSigningComplete,
} from '../../services/tenant/docusealService';

/**
 * Signing flow props
 */
interface LeaseSigningFlowProps {
  embedUrl: string;
  documentName: string;
  leaseId: string;
  tenantId: string;
  tenantEmail: string;
  propertyName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

/**
 * DocuSeal event types
 */
interface DocuSealEvent {
  type: string;
  data?: {
    status?: string;
    currentField?: number;
    totalFields?: number;
    submission_id?: string;
  };
}

/**
 * Main signing flow component
 */
export default function LeaseSigningFlow({
  embedUrl,
  documentName,
  leaseId,
  tenantId,
  tenantEmail,
  propertyName,
  onComplete,
  onCancel,
}: LeaseSigningFlowProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentField, setCurrentField] = useState(0);
  const [totalFields, setTotalFields] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const embedConfig = getDocuSealEmbedConfig();

  // Handle messages from DocuSeal iframe
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('docuseal')) return;

      const data = event.data as DocuSealEvent;

      switch (data.type) {
        case 'docuseal:load':
          setLoading(false);
          break;

        case 'docuseal:field_change':
          if (data.data?.currentField !== undefined) {
            setCurrentField(data.data.currentField);
          }
          if (data.data?.totalFields !== undefined) {
            setTotalFields(data.data.totalFields);
          }
          break;

        case 'docuseal:complete':
          setIsComplete(true);
          // Notify backend of completion
          if (data.data?.submission_id) {
            await handleSigningComplete(data.data.submission_id, tenantEmail);
          }
          break;

        case 'docuseal:error':
          setError('An error occurred during signing. Please try again.');
          break;
      }
    },
    [tenantEmail]
  );

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Handle completion
  const handleCompleted = () => {
    onComplete?.();
    navigate('/tenant/documents?signed=true');
  };

  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will not be saved.')) {
      onCancel?.();
      navigate('/tenant/documents');
    }
  };

  // Render complete state
  if (isComplete) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8">
          <SigningComplete
            documentName={documentName}
            onDownload={() => {
              // Download signed document
              window.open(`/tenant/documents/${leaseId}/download`, '_blank');
            }}
            onContinue={handleCompleted}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-lightest flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-light sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back / Cancel */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-neutral hover:text-neutral-dark transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Exit Signing</span>
            </button>

            {/* Document info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-neutral-dark">
                <FileSignature className="h-5 w-5 text-primary" />
                <span className="font-medium">{documentName}</span>
              </div>
            </div>

            {/* Help button */}
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 text-neutral hover:text-neutral-dark transition-colors"
            >
              <HelpCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Need Help?</span>
            </button>
          </div>

          {/* Progress bar */}
          {totalFields > 0 && (
            <div className="mt-3">
              <SignatureProgressBar
                currentField={currentField}
                totalFields={totalFields}
                variant="minimal"
              />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-30">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-neutral-dark">Loading document...</p>
              <p className="text-sm text-neutral mt-1">
                This may take a few seconds
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-30">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
                Unable to Load Document
              </h2>
              <p className="text-neutral-dark mb-6">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    // Reload iframe
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                      iframe.src = embedUrl;
                    }
                  }}
                >
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* DocuSeal iframe */}
        <iframe
          src={embedUrl}
          className="w-full h-full min-h-[calc(100vh-120px)] border-0"
          title="Sign Document"
          allow="camera; microphone"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          style={{
            ...embedConfig.customCss && { colorScheme: 'light' },
          }}
        />
      </main>

      {/* Signing tips footer (mobile only) */}
      <footer className="sm:hidden bg-white border-t border-neutral-light p-4">
        <div className="flex items-center gap-3 text-sm text-neutral-dark">
          <FileSignature className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Tap each highlighted field to add your signature or initials</span>
        </div>
      </footer>

      {/* Help modal */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}

/**
 * Help modal component
 */
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-darkest">
            Need Help Signing?
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral hover:text-neutral-dark transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tips */}
          <div>
            <h3 className="font-medium text-neutral-darkest mb-2">
              Signing Tips
            </h3>
            <ul className="space-y-2 text-sm text-neutral-dark">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  1
                </span>
                <span>Tap the highlighted fields to add your signature</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  2
                </span>
                <span>Use your finger or mouse to draw your signature</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  3
                </span>
                <span>Complete all required fields to finish signing</span>
              </li>
            </ul>
          </div>

          {/* Contact support */}
          <div className="pt-4 border-t border-neutral-light">
            <h3 className="font-medium text-neutral-darkest mb-2">
              Contact Property Manager
            </h3>
            <div className="space-y-2">
              <a
                href="tel:+15551234567"
                className="flex items-center gap-3 p-3 rounded-lg bg-neutral-lightest hover:bg-neutral-light transition-colors"
              >
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-sm text-neutral-darkest">(555) 123-4567</span>
              </a>
              <a
                href="mailto:support@propmaster.com"
                className="flex items-center gap-3 p-3 rounded-lg bg-neutral-lightest hover:bg-neutral-light transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-sm text-neutral-darkest">support@propmaster.com</span>
              </a>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={onClose}
        >
          Got it, continue signing
        </Button>
      </Card>
    </div>
  );
}

/**
 * Signing flow wrapper with loading state
 */
interface SigningFlowLoaderProps {
  signingRequestId: string;
  tenantId: string;
  tenantEmail: string;
  onLoad: (embedUrl: string, documentName: string, leaseId: string) => void;
  onError: (error: string) => void;
}

export function SigningFlowLoader({
  signingRequestId,
  tenantId,
  tenantEmail,
  onLoad,
  onError,
}: SigningFlowLoaderProps) {
  useEffect(() => {
    async function loadSigningData() {
      try {
        const { getSigningUrl } = await import('../../services/tenant/docusealService');
        const result = await getSigningUrl(signingRequestId, tenantId);

        if (result.success && result.embedUrl) {
          onLoad(result.embedUrl, 'Lease Agreement', signingRequestId);
        } else {
          onError(result.error || 'Failed to load signing URL');
        }
      } catch (err) {
        onError('An unexpected error occurred');
      }
    }

    loadSigningData();
  }, [signingRequestId, tenantId, onLoad, onError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-neutral-dark">Preparing document for signing...</p>
      </div>
    </div>
  );
}

/**
 * Pre-signing review component
 */
interface PreSigningReviewProps {
  documentName: string;
  propertyName?: string;
  leaseTerms?: {
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit?: number;
  };
  onProceed: () => void;
  onCancel: () => void;
}

export function PreSigningReview({
  documentName,
  propertyName,
  leaseTerms,
  onProceed,
  onCancel,
}: PreSigningReviewProps) {
  return (
    <Card className="max-w-lg mx-auto p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileSignature className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-darkest">
          Ready to Sign
        </h2>
        <p className="text-neutral-dark mt-2">
          Review the details below before signing your lease agreement.
        </p>
      </div>

      {/* Document info */}
      <div className="bg-neutral-lightest rounded-lg p-4 mb-6">
        <h3 className="font-medium text-neutral-darkest mb-3">{documentName}</h3>

        {propertyName && (
          <div className="text-sm text-neutral-dark mb-2">
            Property: <span className="font-medium">{propertyName}</span>
          </div>
        )}

        {leaseTerms && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral">Lease Term:</span>
              <span className="font-medium text-neutral-darkest">
                {new Date(leaseTerms.startDate).toLocaleDateString()} - {new Date(leaseTerms.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral">Monthly Rent:</span>
              <span className="font-medium text-neutral-darkest">
                ${leaseTerms.monthlyRent.toLocaleString()}
              </span>
            </div>
            {leaseTerms.securityDeposit !== undefined && (
              <div className="flex justify-between">
                <span className="text-neutral">Security Deposit:</span>
                <span className="font-medium text-neutral-darkest">
                  ${leaseTerms.securityDeposit.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legal disclaimer */}
      <div className="text-xs text-neutral mb-6">
        By clicking "Begin Signing", you agree that your electronic signature
        is legally binding and equivalent to a handwritten signature under
        applicable law.
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button variant="primary" onClick={onProceed} className="flex-1">
          <FileSignature className="h-4 w-4 mr-2" />
          Begin Signing
        </Button>
      </div>
    </Card>
  );
}
