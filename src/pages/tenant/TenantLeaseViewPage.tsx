/**
 * Tenant Lease View Page
 * Read-only lease preview with property details and signing CTA
 * Gateway to the signing experience
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Home,
  MapPin,
  Clock,
  Download,
  Edit3,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  Eye,
  FileSignature,
} from 'lucide-react';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import DocumentViewer from '../../components/tenant/DocumentViewer';
import SignatureProgressBar from '../../components/tenant/SignatureProgressBar';
import {
  getDocument,
  downloadDocument,
  TenantDocument,
  DOCUMENT_STATUSES,
} from '../../services/tenant/tenantDocumentService';

export default function TenantLeaseViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useRequireTenantAuth();

  const [document, setDocument] = useState<TenantDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullViewer, setShowFullViewer] = useState(false);

  // Load document
  useEffect(() => {
    async function loadDocument() {
      if (!id || !tenant?.id) return;

      try {
        setLoading(true);
        const doc = await getDocument(id, tenant.id);
        if (doc) {
          setDocument(doc);
        } else {
          setError('Document not found');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [id, tenant?.id]);

  // Handle download
  const handleDownload = async () => {
    if (!document) return;
    await downloadDocument(document.file_url, document.file_name);
  };

  // Check if signing is needed
  const needsSignature =
    document &&
    ['pending_signature', 'partially_signed'].includes(document.status) &&
    document.signing_request?.my_signer?.status !== 'signed';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-dark">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
            Document Not Found
          </h2>
          <p className="text-neutral-dark mb-6">
            {error || "We couldn't find the document you're looking for."}
          </p>
          <Button onClick={() => navigate('/tenant/documents')}>
            Back to Documents
          </Button>
        </Card>
      </div>
    );
  }

  const statusInfo = DOCUMENT_STATUSES[document.status];

  return (
    <div className="min-h-screen bg-neutral-lightest">
      {/* Header */}
      <div className="bg-white border-b border-neutral-light sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/tenant/documents"
              className="flex items-center gap-2 text-neutral hover:text-neutral-dark transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Documents</span>
            </Link>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>

              {needsSignature && (
                <Link to={`/tenant/documents/${id}/sign`}>
                  <Button variant="primary" size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Sign Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Document info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document header */}
            <Card className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-semibold text-lg text-neutral-darkest">
                    {document.name}
                  </h1>
                  <p className="text-sm text-neutral mt-0.5">
                    Lease Agreement
                  </p>
                </div>
              </div>

              <Badge
                variant={
                  statusInfo?.color === 'success' ? 'success' :
                  statusInfo?.color === 'warning' ? 'warning' :
                  statusInfo?.color === 'error' ? 'error' : 'neutral'
                }
                className="w-full justify-center py-2"
              >
                {statusInfo?.label}
              </Badge>
            </Card>

            {/* Property info */}
            {document.property && (
              <Card className="p-5">
                <h2 className="font-medium text-neutral-darkest mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Property Details
                </h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-neutral">Property</p>
                    <p className="font-medium text-neutral-darkest">
                      {document.property.name}
                    </p>
                  </div>

                  {document.unit && (
                    <div>
                      <p className="text-sm text-neutral">Unit</p>
                      <p className="font-medium text-neutral-darkest">
                        {document.unit.name}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-neutral">Address</p>
                    <p className="font-medium text-neutral-darkest flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-neutral flex-shrink-0 mt-0.5" />
                      {document.property.address}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Signing status */}
            {document.signing_request && (
              <Card className="p-5">
                <h2 className="font-medium text-neutral-darkest mb-4 flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  Signing Status
                </h2>

                <div className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-neutral">Signatures</span>
                      <span className="font-medium">
                        {document.signing_request.signed_signers} of{' '}
                        {document.signing_request.total_signers}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${
                            (document.signing_request.signed_signers /
                              document.signing_request.total_signers) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* My status */}
                  {document.signing_request.my_signer && (
                    <div className="flex items-center justify-between p-3 bg-neutral-lightest rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-neutral" />
                        <span className="text-sm text-neutral-dark">Your status</span>
                      </div>
                      {document.signing_request.my_signer.status === 'signed' ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Created date */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Sent on
                    </span>
                    <span className="text-neutral-darkest">
                      {new Date(document.signing_request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Action card for pending signatures */}
            {needsSignature && (
              <Card className="p-5 border-primary/30 bg-primary/5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Edit3 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-medium text-neutral-darkest mb-2">
                    Ready to Sign?
                  </h3>
                  <p className="text-sm text-neutral-dark mb-4">
                    Review the document and complete your electronic signature
                  </p>
                  <Link to={`/tenant/documents/${id}/sign`} className="block">
                    <Button variant="primary" className="w-full">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Begin Signing
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Right column - Document preview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              {/* Preview header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-light">
                <h2 className="font-medium text-neutral-darkest flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Document Preview
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullViewer(true)}
                >
                  Full Screen
                </Button>
              </div>

              {/* Document viewer */}
              <div className="bg-neutral-dark" style={{ height: '600px' }}>
                <DocumentViewer
                  documentUrl={document.file_url}
                  documentName={document.name}
                  showHeader={false}
                  allowDownload={false}
                />
              </div>
            </Card>

            {/* Legal disclaimer */}
            <div className="mt-4 p-4 bg-neutral-lightest rounded-lg text-sm text-neutral">
              <p>
                By signing this document, you agree that your electronic signature is
                legally binding and equivalent to a handwritten signature under the
                ESIGN Act and applicable state laws.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full screen viewer modal */}
      {showFullViewer && (
        <div className="fixed inset-0 z-50">
          <DocumentViewer
            documentUrl={document.file_url}
            documentName={document.name}
            fullscreen
            onClose={() => setShowFullViewer(false)}
          />
        </div>
      )}
    </div>
  );
}
