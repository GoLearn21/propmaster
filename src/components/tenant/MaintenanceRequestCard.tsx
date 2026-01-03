/**
 * Maintenance Request Card Component
 * Displays a summary of a maintenance request in a card format
 * Used in the maintenance requests list view
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet,
  Zap,
  Thermometer,
  UtensilsCrossed,
  Hammer,
  PaintBucket,
  LayoutGrid,
  Home,
  Leaf,
  Sparkles,
  HelpCircle,
  Clock,
  Calendar,
  ChevronRight,
  Image as ImageIcon,
  Star,
  User,
} from 'lucide-react';
import {
  MaintenanceRequest,
  MaintenanceCategory,
  MaintenanceStatus,
  MaintenancePriority,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
} from '../../services/tenant/tenantMaintenanceService';

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
  onClick?: () => void;
}

/**
 * Category icons mapping
 */
const CATEGORY_ICONS: Record<MaintenanceCategory, React.ElementType> = {
  plumbing: Droplet,
  electrical: Zap,
  hvac: Thermometer,
  appliances: UtensilsCrossed,
  carpentry: Hammer,
  painting: PaintBucket,
  flooring: LayoutGrid,
  roofing: Home,
  landscaping: Leaf,
  cleaning: Sparkles,
  other: HelpCircle,
};

/**
 * Status colors for background
 */
const STATUS_BG_COLORS: Record<MaintenanceStatus, string> = {
  open: 'bg-primary/10 text-primary',
  assigned: 'bg-secondary/10 text-secondary',
  in_progress: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-neutral/10 text-neutral',
  on_hold: 'bg-neutral/10 text-neutral',
};

/**
 * Priority colors
 */
const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  low: 'text-neutral',
  medium: 'text-warning',
  high: 'text-error',
  emergency: 'text-error',
};

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format scheduled date
 */
function formatScheduledDate(dateString: string, startTime?: string, endTime?: string): string {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (startTime && endTime) {
    return `${dateStr} ${startTime} - ${endTime}`;
  }
  return dateStr;
}

export default function MaintenanceRequestCard({
  request,
  onClick,
}: MaintenanceRequestCardProps) {
  const CategoryIcon = CATEGORY_ICONS[request.category];
  const statusInfo = MAINTENANCE_STATUSES[request.status];
  const priorityInfo = MAINTENANCE_PRIORITIES[request.priority];
  const priorityColor = PRIORITY_COLORS[request.priority];
  const statusBgColor = STATUS_BG_COLORS[request.status];

  const content = (
    <div className="bg-white rounded-lg border border-neutral-light hover:border-neutral hover:shadow-md transition-all p-4">
      <div className="flex items-start gap-4">
        {/* Category Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${statusBgColor}`}>
          <CategoryIcon className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-neutral-darkest truncate">
              {request.title}
            </h3>
            <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${statusBgColor}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Category & Priority */}
          <div className="flex items-center gap-3 text-sm mb-2">
            <span className="text-neutral">
              {MAINTENANCE_CATEGORIES[request.category].label}
            </span>
            <span className={`flex items-center gap-1 ${priorityColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
              {priorityInfo.label}
            </span>
          </div>

          {/* Description Preview */}
          {request.description && (
            <p className="text-sm text-neutral-dark line-clamp-2 mb-3">
              {request.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral">
            {/* Created Date */}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(request.created_at)}
            </span>

            {/* Scheduled Date */}
            {request.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatScheduledDate(
                  request.scheduled_date,
                  request.scheduled_time_start,
                  request.scheduled_time_end
                )}
              </span>
            )}

            {/* Vendor */}
            {request.vendor && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {request.vendor.first_name} {request.vendor.last_name}
              </span>
            )}

            {/* Images */}
            {request.images && request.images.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {request.images.length} photo{request.images.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Rating */}
            {request.tenant_rating && (
              <span className="flex items-center gap-1 text-warning">
                <Star className="h-3.5 w-3.5 fill-current" />
                {request.tenant_rating}/5
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-neutral flex-shrink-0" />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link to={`/tenant/maintenance/${request.id}`} className="block">
      {content}
    </Link>
  );
}

/**
 * Compact version for sidebar/widgets
 */
interface CompactMaintenanceCardProps {
  request: MaintenanceRequest;
}

export function CompactMaintenanceCard({ request }: CompactMaintenanceCardProps) {
  const statusInfo = MAINTENANCE_STATUSES[request.status];
  const statusBgColor = STATUS_BG_COLORS[request.status];

  return (
    <Link
      to={`/tenant/maintenance/${request.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-lightest transition-colors"
    >
      <div className={`w-2 h-2 rounded-full ${statusBgColor.replace('bg-', 'bg-').split(' ')[0]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-darkest truncate">
          {request.title}
        </p>
        <p className="text-xs text-neutral">
          {statusInfo.label} · {formatRelativeTime(request.created_at)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral" />
    </Link>
  );
}

/**
 * Skeleton loader for maintenance card
 */
export function MaintenanceRequestCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-neutral-light p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-neutral-light" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-48 bg-neutral-light rounded" />
            <div className="h-5 w-20 bg-neutral-light rounded-full" />
          </div>
          <div className="h-4 w-32 bg-neutral-light rounded mb-3" />
          <div className="h-4 w-full bg-neutral-light rounded mb-2" />
          <div className="h-4 w-3/4 bg-neutral-light rounded mb-3" />
          <div className="flex gap-4">
            <div className="h-3 w-16 bg-neutral-light rounded" />
            <div className="h-3 w-24 bg-neutral-light rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  status?: MaintenanceStatus;
  onCreateNew?: () => void;
}

export function MaintenanceEmptyState({ status, onCreateNew }: EmptyStateProps) {
  let message = 'No maintenance requests found';
  let description = 'You haven\'t submitted any maintenance requests yet.';

  if (status) {
    const statusInfo = MAINTENANCE_STATUSES[status];
    message = `No ${statusInfo.label.toLowerCase()} requests`;
    description = `You don't have any maintenance requests with "${statusInfo.label}" status.`;
  }

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-lightest mb-4">
        <Hammer className="h-8 w-8 text-neutral" />
      </div>
      <h3 className="text-lg font-medium text-neutral-darkest mb-2">{message}</h3>
      <p className="text-neutral-dark mb-6">{description}</p>
      {onCreateNew && (
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Submit Request
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
