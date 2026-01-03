/**
 * Tenant Documents Page
 * Document hub for leases, uploads, and signing requests
 * Provides DocuSign-quality document management experience
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Upload,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit3,
  FileSignature,
  Shield,
  CreditCard,
  File,
  X,
  Plus,
} from 'lucide-react';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LeaseCard, { LeaseCardSkeleton, NoLeasesCard } from '../../components/tenant/LeaseCard';
import { DocumentViewerModal } from '../../components/tenant/DocumentViewer';
import {
  getTenantDocuments,
  getPendingSignatures,
  uploadTenantDocument,
  downloadDocument,
  TenantDocument,
  DocumentType,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
} from '../../services/tenant/tenantDocumentService';

type TabType = 'all' | 'leases' | 'pending' | 'uploads';

/**
 * Document icon mapping
 */
const DOCUMENT_ICONS: Record<DocumentType, React.ElementType> = {
  lease: FileText,
  addendum: FileText,
  renewal: FileSignature,
  notice: AlertCircle,
  disclosure: File,
  insurance: Shield,
  id: CreditCard,
  receipt: File,
  other: File,
};

export default function TenantDocumentsPage() {
  const { tenant } = useRequireTenantAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<TenantDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success params
  useEffect(() => {
    if (searchParams.get('signed') === 'true') {
      setSuccessMessage('Document signed successfully! A copy has been saved to your documents.');
      searchParams.delete('signed');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams, setSearchParams]);

  // Load documents
  useEffect(() => {
    async function loadDocuments() {
      if (!tenant?.id) return;

      try {
        setLoading(true);
        const docs = await getTenantDocuments(tenant.id);
        setDocuments(docs);
      } catch (err) {
        console.error('Error loading documents:', err);
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [tenant?.id]);

  // Filter documents by tab
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by tab
    switch (activeTab) {
      case 'leases':
        filtered = filtered.filter((d) =>
          ['lease', 'addendum', 'renewal'].includes(d.document_type)
        );
        break;
      case 'pending':
        filtered = filtered.filter((d) =>
          ['pending_signature', 'partially_signed'].includes(d.status) &&
          d.signing_request?.my_signer?.status !== 'signed'
        );
        break;
      case 'uploads':
        filtered = filtered.filter((d) =>
          ['insurance', 'id', 'receipt', 'other'].includes(d.document_type)
        );
        break;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.name.toLowerCase().includes(query) ||
        d.document_type.toLowerCase().includes(query) ||
        d.property?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, activeTab, searchQuery]);

  // Count by category
  const counts = useMemo(() => ({
    all: documents.length,
    leases: documents.filter((d) =>
      ['lease', 'addendum', 'renewal'].includes(d.document_type)
    ).length,
    pending: documents.filter((d) =>
      ['pending_signature', 'partially_signed'].includes(d.status) &&
      d.signing_request?.my_signer?.status !== 'signed'
    ).length,
    uploads: documents.filter((d) =>
      ['insurance', 'id', 'receipt', 'other'].includes(d.document_type)
    ).length,
  }), [documents]);

  // Handle document view
  const handleViewDocument = (doc: TenantDocument) => {
    setSelectedDocument(doc);
  };

  // Handle document download
  const handleDownload = async (doc: TenantDocument) => {
    await downloadDocument(doc.file_url, doc.file_name);
  };

  // Handle upload success
  const handleUploadSuccess = (doc: TenantDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setShowUploadModal(false);
    setSuccessMessage('Document uploaded successfully!');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Tabs configuration
  const tabs: Array<{ value: TabType; label: string; count: number; icon: React.ElementType }> = [
    { value: 'all', label: 'All', count: counts.all, icon: FileText },
    { value: 'leases', label: 'Leases', count: counts.leases, icon: FileSignature },
    { value: 'pending', label: 'Pending', count: counts.pending, icon: Clock },
    { value: 'uploads', label: 'My Uploads', count: counts.uploads, icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-success-dark">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-success hover:text-success-dark"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-darkest">Documents</h1>
            <p className="text-neutral-dark mt-1">
              View and manage your lease documents and uploads
            </p>
          </div>

          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Pending signatures alert */}
        {counts.pending > 0 && activeTab !== 'pending' && (
          <Card className="mb-6 p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Edit3 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-darkest">
                    {counts.pending} document{counts.pending !== 1 ? 's' : ''} awaiting your signature
                  </h3>
                  <p className="text-sm text-neutral-dark">
                    Please review and sign to complete your lease process
                  </p>
                </div>
              </div>
              <Button
                variant="warning"
                size="sm"
                onClick={() => setActiveTab('pending')}
              >
                View Pending
              </Button>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-neutral-dark hover:bg-neutral-lightest border border-neutral-light'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${activeTab === tab.value
                    ? 'bg-white/20 text-white'
                    : tab.value === 'pending'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-neutral-lightest text-neutral'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-light focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral hover:text-neutral-dark"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="space-y-4">
            <LeaseCardSkeleton />
            <LeaseCardSkeleton />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-darkest mb-2">
              Error Loading Documents
            </h3>
            <p className="text-neutral-dark mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            tab={activeTab}
            searchQuery={searchQuery}
            onUpload={() => setShowUploadModal(true)}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => handleViewDocument(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        )}

        {/* Document viewer modal */}
        {selectedDocument && (
          <DocumentViewerModal
            isOpen={true}
            onClose={() => setSelectedDocument(null)}
            documentUrl={selectedDocument.file_url}
            documentName={selectedDocument.name}
            documentType={DOCUMENT_TYPES[selectedDocument.document_type]?.label}
          />
        )}

        {/* Upload modal */}
        {showUploadModal && tenant && (
          <UploadModal
            tenantId={tenant.id}
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Document card component
 */
interface DocumentCardProps {
  document: TenantDocument;
  onView: () => void;
  onDownload: () => void;
}

function DocumentCard({ document, onView, onDownload }: DocumentCardProps) {
  const Icon = DOCUMENT_ICONS[document.document_type];
  const typeInfo = DOCUMENT_TYPES[document.document_type];
  const statusInfo = DOCUMENT_STATUSES[document.status];
  const needsSignature =
    ['pending_signature', 'partially_signed'].includes(document.status) &&
    document.signing_request?.my_signer?.status !== 'signed';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Signing alert banner */}
      {needsSignature && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning-dark">
              Signature required
            </span>
          </div>
          <Link to={`/tenant/documents/${document.id}/sign`}>
            <Button variant="warning" size="sm">
              Sign Now
            </Button>
          </Link>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
            ${needsSignature ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}
          `}>
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-neutral-darkest">
                  {document.name}
                </h3>
                <p className="text-sm text-neutral mt-0.5">
                  {typeInfo?.label}
                  {document.property && ` • ${document.property.name}`}
                </p>
              </div>

              <Badge
                variant={
                  statusInfo?.color === 'success' ? 'success' :
                  statusInfo?.color === 'warning' ? 'warning' :
                  statusInfo?.color === 'error' ? 'error' : 'neutral'
                }
                size="sm"
              >
                {statusInfo?.label}
              </Badge>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-neutral">
              <span>
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>

              {document.expires_at && (
                <span className={`
                  flex items-center gap-1
                  ${new Date(document.expires_at) < new Date() ? 'text-error' : ''}
                `}>
                  <Clock className="h-3.5 w-3.5" />
                  Expires {new Date(document.expires_at).toLocaleDateString()}
                </span>
              )}

              {document.signing_request && (
                <span className="flex items-center gap-1">
                  <FileSignature className="h-3.5 w-3.5" />
                  {document.signing_request.signed_signers}/{document.signing_request.total_signers} signed
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-1.5" />
                View
              </Button>

              {document.status === 'signed' && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              )}

              {needsSignature && (
                <Link to={`/tenant/documents/${document.id}/sign`}>
                  <Button variant="primary" size="sm">
                    <Edit3 className="h-4 w-4 mr-1.5" />
                    Sign Document
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  tab: TabType;
  searchQuery: string;
  onUpload: () => void;
  onClearSearch: () => void;
}

function EmptyState({ tab, searchQuery, onUpload, onClearSearch }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <Card className="p-8 text-center">
        <Search className="h-12 w-12 text-neutral mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-darkest mb-2">
          No results found
        </h3>
        <p className="text-neutral-dark mb-4">
          No documents match "{searchQuery}"
        </p>
        <Button variant="outline" onClick={onClearSearch}>
          Clear Search
        </Button>
      </Card>
    );
  }

  const content = {
    all: {
      icon: FileText,
      title: 'No Documents Yet',
      description: 'Your documents will appear here when available.',
    },
    leases: {
      icon: FileSignature,
      title: 'No Lease Documents',
      description: 'When your property manager sends you a lease, it will appear here.',
    },
    pending: {
      icon: CheckCircle,
      title: 'Nothing to Sign',
      description: "You're all caught up! No documents require your signature.",
    },
    uploads: {
      icon: Upload,
      title: 'No Uploaded Documents',
      description: 'Upload documents like insurance or ID for your records.',
    },
  }[tab];

  return (
    <Card className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-lightest mb-4">
        <content.icon className="h-8 w-8 text-neutral" />
      </div>
      <h3 className="text-lg font-medium text-neutral-darkest mb-2">
        {content.title}
      </h3>
      <p className="text-neutral-dark mb-4 max-w-md mx-auto">
        {content.description}
      </p>
      {tab === 'uploads' && (
        <Button onClick={onUpload}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      )}
    </Card>
  );
}

/**
 * Upload modal component
 */
interface UploadModalProps {
  tenantId: string;
  onClose: () => void;
  onSuccess: (doc: TenantDocument) => void;
}

function UploadModal({ tenantId, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('insurance');
  const [expiresAt, setExpiresAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadTypes: Array<{ value: DocumentType; label: string }> = [
    { value: 'insurance', label: "Renter's Insurance" },
    { value: 'id', label: 'Identification' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'other', label: 'Other Document' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const result = await uploadTenantDocument(
      tenantId,
      file,
      documentType,
      expiresAt || undefined
    );

    setUploading(false);

    if (result.success && result.document) {
      onSuccess(result.document);
    } else {
      setError(result.error || 'Failed to upload document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-darkest">
            Upload Document
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral hover:text-neutral-dark transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Select File
            </label>
            <div className="border-2 border-dashed border-neutral-light rounded-lg p-4 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm text-neutral-darkest">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1 text-neutral hover:text-error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 text-neutral mx-auto mb-2" />
                  <span className="text-sm text-neutral-dark">
                    Click to select or drag and drop
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {uploadTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expiration date (optional) */}
          {(documentType === 'insurance' || documentType === 'id') && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-light focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
