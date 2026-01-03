/**
 * Lease Card Component
 * Displays lease summary with signing status and quick actions
 * Mobile-optimized with clear visual hierarchy
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Home,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Edit3,
  Eye,
  Download,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DocumentStatus, SignerStatus } from '../../services/tenant/tenantDocumentService';

interface LeaseCardProps {
  id: string;
  propertyName: string;
  unitName?: string;
  address: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: DocumentStatus;
  signerStatus?: SignerStatus;
  documentUrl?: string;
  signatureProgress?: {
    completed: number;
    total: number;
  };
  onView?: () => void;
  onSign?: () => void;
  onDownload?: () => void;
  compact?: boolean;
}

/**
 * Status badge configuration
 */
const STATUS_CONFIG: Record<DocumentStatus, {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'neutral' | 'primary';
  icon: React.ElementType;
}> = {
  draft: { label: 'Draft', variant: 'neutral', icon: FileText },
  pending_signature: { label: 'Ready to Sign', variant: 'warning', icon: Edit3 },
  partially_signed: { label: 'Partially Signed', variant: 'primary', icon: Clock },
  signed: { label: 'Signed', variant: 'success', icon: CheckCircle },
  expired: { label: 'Expired', variant: 'error', icon: AlertCircle },
  voided: { label: 'Voided', variant: 'neutral', icon: AlertCircle },
};

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate days until lease end
 */
function getDaysUntilEnd(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function LeaseCard({
  id,
  propertyName,
  unitName,
  address,
  startDate,
  endDate,
  monthlyRent,
  status,
  signerStatus,
  documentUrl,
  signatureProgress,
  onView,
  onSign,
  onDownload,
  compact = false,
}: LeaseCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const daysUntilEnd = getDaysUntilEnd(endDate);
  const isExpiringSoon = daysUntilEnd <= 60 && daysUntilEnd > 0;
  const needsSignature = status === 'pending_signature' && signerStatus !== 'signed';

  if (compact) {
    return (
      <LeaseCardCompact
        id={id}
        propertyName={propertyName}
        unitName={unitName}
        status={status}
        monthlyRent={monthlyRent}
        endDate={endDate}
        needsSignature={needsSignature}
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Status banner for pending signatures */}
      {needsSignature && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning-dark">
              Your signature is required
            </span>
          </div>
          <Button variant="warning" size="sm" onClick={onSign}>
            Sign Now
          </Button>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {/* Property icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-6 w-6 text-primary" />
            </div>

            {/* Property info */}
            <div>
              <h3 className="font-semibold text-lg text-neutral-darkest">
                {propertyName}
              </h3>
              {unitName && (
                <p className="text-sm text-neutral">{unitName}</p>
              )}
              <p className="text-sm text-neutral-dark mt-0.5">{address}</p>
            </div>
          </div>

          {/* Status badge */}
          <Badge variant={statusConfig.variant} className="flex-shrink-0">
            <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Lease details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-neutral-light">
          {/* Monthly Rent */}
          <div>
            <div className="flex items-center gap-1.5 text-neutral text-xs uppercase tracking-wide mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Monthly Rent
            </div>
            <p className="font-semibold text-neutral-darkest">
              {formatCurrency(monthlyRent)}
            </p>
          </div>

          {/* Start Date */}
          <div>
            <div className="flex items-center gap-1.5 text-neutral text-xs uppercase tracking-wide mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Start Date
            </div>
            <p className="font-medium text-neutral-darkest">
              {formatDate(startDate)}
            </p>
          </div>

          {/* End Date */}
          <div>
            <div className="flex items-center gap-1.5 text-neutral text-xs uppercase tracking-wide mb-1">
              <Calendar className="h-3.5 w-3.5" />
              End Date
            </div>
            <p className="font-medium text-neutral-darkest">
              {formatDate(endDate)}
            </p>
          </div>

          {/* Time remaining */}
          <div>
            <div className="flex items-center gap-1.5 text-neutral text-xs uppercase tracking-wide mb-1">
              <Clock className="h-3.5 w-3.5" />
              Time Left
            </div>
            <p className={`font-medium ${
              daysUntilEnd <= 0
                ? 'text-error'
                : isExpiringSoon
                ? 'text-warning-dark'
                : 'text-neutral-darkest'
            }`}>
              {daysUntilEnd <= 0
                ? 'Expired'
                : daysUntilEnd === 1
                ? '1 day'
                : `${daysUntilEnd} days`}
            </p>
          </div>
        </div>

        {/* Signature progress (if applicable) */}
        {signatureProgress && signatureProgress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral">Signature Progress</span>
              <span className="font-medium text-neutral-darkest">
                {signatureProgress.completed} of {signatureProgress.total} completed
              </span>
            </div>
            <div className="h-2 bg-neutral-light rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${(signatureProgress.completed / signatureProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Expiring soon alert */}
        {isExpiringSoon && status === 'signed' && (
          <div className="mt-4 p-3 bg-warning/10 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-dark">
                Lease expiring soon
              </p>
              <p className="text-sm text-neutral-dark mt-0.5">
                Your lease will expire in {daysUntilEnd} days. Contact your property manager about renewal options.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-5">
          <Button variant="outline" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View Lease
          </Button>

          {status === 'signed' && documentUrl && (
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          {needsSignature && (
            <Button variant="primary" onClick={onSign}>
              <Edit3 className="h-4 w-4 mr-2" />
              Sign Lease
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact lease card for lists
 */
interface LeaseCardCompactProps {
  id: string;
  propertyName: string;
  unitName?: string;
  status: DocumentStatus;
  monthlyRent: number;
  endDate: string;
  needsSignature: boolean;
}

function LeaseCardCompact({
  id,
  propertyName,
  unitName,
  status,
  monthlyRent,
  endDate,
  needsSignature,
}: LeaseCardCompactProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Link
      to={`/tenant/documents/${id}`}
      className="block bg-white rounded-lg border border-neutral-light p-4 hover:border-primary hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
            ${needsSignature ? 'bg-warning/10' : 'bg-primary/10'}
          `}>
            {needsSignature ? (
              <Edit3 className="h-5 w-5 text-warning" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <h4 className="font-medium text-neutral-darkest truncate">
              {propertyName}
              {unitName && <span className="text-neutral"> - {unitName}</span>}
            </h4>
            <div className="flex items-center gap-3 text-sm text-neutral mt-0.5">
              <span>{formatCurrency(monthlyRent)}/mo</span>
              <span>Ends {formatDate(endDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
          <ChevronRight className="h-5 w-5 text-neutral" />
        </div>
      </div>
    </Link>
  );
}

/**
 * Lease card skeleton loader
 */
export function LeaseCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-neutral-light" />
          <div className="flex-1">
            <div className="h-5 w-48 bg-neutral-light rounded mb-2" />
            <div className="h-4 w-32 bg-neutral-light rounded" />
          </div>
          <div className="h-6 w-20 bg-neutral-light rounded-full" />
        </div>

        <div className="grid grid-cols-4 gap-4 py-4 border-y border-neutral-light">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-16 bg-neutral-light rounded mb-2" />
              <div className="h-5 w-20 bg-neutral-light rounded" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <div className="h-10 w-28 bg-neutral-light rounded-lg" />
          <div className="h-10 w-28 bg-neutral-light rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Empty lease state
 */
export function NoLeasesCard() {
  return (
    <Card className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-lightest mb-4">
        <FileText className="h-8 w-8 text-neutral" />
      </div>
      <h3 className="text-lg font-medium text-neutral-darkest mb-2">
        No Active Leases
      </h3>
      <p className="text-neutral-dark max-w-md mx-auto">
        You don't have any active lease agreements. When your property manager
        sends you a lease, it will appear here for review and signing.
      </p>
    </Card>
  );
}
