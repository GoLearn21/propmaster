/**
 * Maintenance Status Timeline Component
 * Visual timeline showing the history of status changes
 * Displays when and who made changes
 */

import React from 'react';
import {
  Circle,
  CheckCircle2,
  User,
  Wrench,
  Building2,
  Clock,
  Calendar,
  MessageSquare,
  AlertCircle,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import {
  MaintenanceStatusHistory,
  MaintenanceStatus,
  MAINTENANCE_STATUSES,
} from '../../services/tenant/tenantMaintenanceService';

interface MaintenanceStatusTimelineProps {
  history: MaintenanceStatusHistory[];
  currentStatus: MaintenanceStatus;
}

/**
 * Status icons
 */
const STATUS_ICONS: Record<MaintenanceStatus, React.ElementType> = {
  open: Circle,
  assigned: User,
  in_progress: Wrench,
  completed: CheckCircle2,
  cancelled: XCircle,
  on_hold: PauseCircle,
};

/**
 * Status colors
 */
const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  open: 'text-primary bg-primary/10 border-primary',
  assigned: 'text-secondary bg-secondary/10 border-secondary',
  in_progress: 'text-warning bg-warning/10 border-warning',
  completed: 'text-success bg-success/10 border-success',
  cancelled: 'text-neutral bg-neutral/10 border-neutral',
  on_hold: 'text-neutral bg-neutral/10 border-neutral',
};

/**
 * Role icons
 */
const ROLE_ICONS: Record<string, React.ElementType> = {
  tenant: User,
  vendor: Wrench,
  manager: Building2,
  system: AlertCircle,
};

/**
 * Format date for timeline
 */
function formatTimelineDate(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

/**
 * Get role display name
 */
function getRoleDisplay(role?: string): string {
  const roles: Record<string, string> = {
    tenant: 'You',
    vendor: 'Technician',
    manager: 'Property Manager',
    system: 'System',
  };
  return roles[role || 'system'] || 'Unknown';
}

export default function MaintenanceStatusTimeline({
  history,
  currentStatus,
}: MaintenanceStatusTimelineProps) {
  // Sort history by date (oldest first for timeline)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-light" />

      {/* Timeline items */}
      <div className="space-y-6">
        {sortedHistory.map((item, index) => {
          const StatusIcon = STATUS_ICONS[item.new_status];
          const statusInfo = MAINTENANCE_STATUSES[item.new_status];
          const statusColor = STATUS_COLORS[item.new_status];
          const RoleIcon = ROLE_ICONS[item.changed_by_role || 'system'];
          const { date, time } = formatTimelineDate(item.created_at);
          const isLatest = index === sortedHistory.length - 1;

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Status Icon */}
              <div
                className={`
                  relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2
                  flex items-center justify-center
                  ${statusColor}
                  ${isLatest ? 'ring-2 ring-offset-2 ring-current/30' : ''}
                `}
              >
                <StatusIcon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className={`flex-1 pb-6 ${isLatest ? '' : ''}`}>
                {/* Status Change */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-neutral-darkest">
                    {statusInfo.label}
                  </span>
                  {isLatest && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-4 text-sm text-neutral mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {time}
                  </span>
                </div>

                {/* Changed By */}
                <div className="flex items-center gap-2 text-sm text-neutral-dark mb-2">
                  <RoleIcon className="h-4 w-4" />
                  <span>{getRoleDisplay(item.changed_by_role)}</span>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="bg-neutral-lightest rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-neutral mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-neutral-dark">{item.notes}</p>
                    </div>
                  </div>
                )}

                {/* Metadata (vendor info, scheduled time, etc.) */}
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-neutral space-y-1">
                    {item.metadata.vendor_name && (
                      <p>Assigned to: {item.metadata.vendor_name}</p>
                    )}
                    {item.metadata.scheduled_date && (
                      <p>Scheduled for: {item.metadata.scheduled_date}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact status progress indicator
 */
interface StatusProgressProps {
  currentStatus: MaintenanceStatus;
}

export function StatusProgressIndicator({ currentStatus }: StatusProgressProps) {
  // Define the standard flow of statuses
  const statusFlow: MaintenanceStatus[] = ['open', 'assigned', 'in_progress', 'completed'];

  const currentIndex = statusFlow.indexOf(currentStatus);
  const isSpecialStatus = currentStatus === 'cancelled' || currentStatus === 'on_hold';

  if (isSpecialStatus) {
    const statusInfo = MAINTENANCE_STATUSES[currentStatus];
    const StatusIcon = STATUS_ICONS[currentStatus];
    return (
      <div className="flex items-center gap-2 text-neutral">
        <StatusIcon className="h-5 w-5" />
        <span className="font-medium">{statusInfo.label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {statusFlow.map((status, index) => {
        const StatusIcon = STATUS_ICONS[status];
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const statusInfo = MAINTENANCE_STATUSES[status];

        return (
          <React.Fragment key={status}>
            {index > 0 && (
              <div
                className={`flex-1 h-1 rounded-full max-w-12 ${
                  isCompleted ? 'bg-success' : 'bg-neutral-light'
                }`}
              />
            )}
            <div
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${isCompleted
                  ? 'bg-success/10 text-success'
                  : isCurrent
                  ? `${STATUS_COLORS[status]}`
                  : 'bg-neutral-lightest text-neutral'
                }
              `}
              title={statusInfo.label}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{statusInfo.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Expected completion timeline
 */
interface ExpectedTimelineProps {
  priority: 'low' | 'medium' | 'high' | 'emergency';
  createdAt: string;
  scheduledDate?: string;
}

export function ExpectedTimeline({ priority, createdAt, scheduledDate }: ExpectedTimelineProps) {
  // Expected response times based on priority
  const expectedDays: Record<string, number> = {
    emergency: 0.25, // 6 hours
    high: 1,
    medium: 3,
    low: 7,
  };

  const createdDate = new Date(createdAt);
  const expectedDate = new Date(createdDate);
  expectedDate.setDate(expectedDate.getDate() + expectedDays[priority]);

  const now = new Date();
  const isOverdue = now > expectedDate && !scheduledDate;

  return (
    <div className={`text-sm ${isOverdue ? 'text-error' : 'text-neutral-dark'}`}>
      {scheduledDate ? (
        <span>
          Scheduled for{' '}
          {new Date(scheduledDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ) : isOverdue ? (
        <span className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Expected response time exceeded
        </span>
      ) : (
        <span>
          Expected response by{' '}
          {expectedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
    </div>
  );
}

/**
 * Timeline skeleton loader
 */
export function TimelineSkeleton() {
  return (
    <div className="relative animate-pulse">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-light" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative flex gap-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-neutral-light" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-neutral-light rounded mb-2" />
            <div className="h-4 w-48 bg-neutral-light rounded mb-2" />
            <div className="h-4 w-24 bg-neutral-light rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
