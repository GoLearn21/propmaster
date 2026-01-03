/**
 * Notification List Component
 * Displays a list of notifications with icons, actions, and time formatting
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  Wrench,
  RefreshCw,
  FileText,
  Calendar,
  File,
  Megaphone,
  Info,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import {
  TenantNotification,
  NotificationType,
  NOTIFICATION_TYPES,
  formatNotificationTime,
  getNotificationAction,
} from '../../services/tenant/tenantNotificationService';
import { useTenantNotifications } from '../../contexts/TenantNotificationContext';

/**
 * Icon mapping for notification types
 */
const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  payment_reminder: Clock,
  payment_received: CheckCircle,
  payment_failed: XCircle,
  maintenance_created: Wrench,
  maintenance_updated: RefreshCw,
  maintenance_completed: CheckCircle,
  lease_ready: FileText,
  lease_signed: CheckCircle,
  lease_renewal: Calendar,
  document_shared: File,
  announcement: Megaphone,
  system: Info,
};

/**
 * Color mapping for notification types
 */
const NOTIFICATION_COLORS: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  neutral: 'bg-neutral/10 text-neutral',
};

interface NotificationListProps {
  notifications: TenantNotification[];
  compact?: boolean;
  showActions?: boolean;
  onNotificationClick?: (notification: TenantNotification) => void;
}

export default function NotificationList({
  notifications,
  compact = false,
  showActions = true,
  onNotificationClick,
}: NotificationListProps) {
  const { markAsRead, deleteNotification } = useTenantNotifications();

  const handleClick = async (notification: TenantNotification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Call parent handler
    onNotificationClick?.(notification);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-neutral-light">
      {notifications.map((notification) => {
        const typeInfo = NOTIFICATION_TYPES[notification.type];
        const Icon = NOTIFICATION_ICONS[notification.type];
        const colorClass = NOTIFICATION_COLORS[typeInfo.color];
        const action = getNotificationAction(notification.type);
        const actionUrl = notification.action_url || action?.path;

        const content = (
          <div
            className={`
              flex gap-3 p-4 transition-colors cursor-pointer
              ${notification.read ? 'bg-white' : 'bg-primary/5'}
              ${compact ? 'hover:bg-neutral-lightest' : 'hover:bg-neutral-lightest'}
            `}
            onClick={() => handleClick(notification)}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm ${notification.read ? 'text-neutral-dark' : 'font-medium text-neutral-darkest'}`}>
                  {notification.title}
                </p>
                {!notification.read && (
                  <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
                )}
              </div>

              {/* Message */}
              <p className={`text-sm text-neutral mt-0.5 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                {notification.message}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-neutral">
                  {formatNotificationTime(notification.created_at)}
                </span>

                {/* Actions */}
                {showActions && !compact && (
                  <div className="flex items-center gap-2">
                    {notification.action_label && actionUrl && (
                      <span className="text-xs font-medium text-primary">
                        {notification.action_label}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-1 text-neutral hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Button (Compact Mode) */}
              {compact && action && (
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-primary">
                  {notification.action_label || action.label}
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        );

        // Wrap in Link if there's an action URL
        if (actionUrl) {
          return (
            <Link
              key={notification.id}
              to={actionUrl}
              className="block group"
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={notification.id} className="group">
            {content}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Notification Item for standalone use
 */
interface NotificationItemProps {
  notification: TenantNotification;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const typeInfo = NOTIFICATION_TYPES[notification.type];
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[typeInfo.color];
  const action = getNotificationAction(notification.type);
  const actionUrl = notification.action_url || action?.path;

  return (
    <div
      className={`
        flex gap-4 p-4 rounded-lg border transition-all
        ${notification.read
          ? 'bg-white border-neutral-light'
          : 'bg-primary/5 border-primary/20 shadow-sm'
        }
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral uppercase">
              {typeInfo.label}
            </span>
            {!notification.read && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded">
                New
              </span>
            )}
          </div>
          <span className="text-xs text-neutral flex-shrink-0">
            {formatNotificationTime(notification.created_at)}
          </span>
        </div>

        {/* Title */}
        <h4 className={`text-base ${notification.read ? 'text-neutral-dark' : 'font-semibold text-neutral-darkest'}`}>
          {notification.title}
        </h4>

        {/* Message */}
        <p className="text-sm text-neutral-dark mt-1">
          {notification.message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3">
          {actionUrl && (
            <Link
              to={actionUrl}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
            >
              {notification.action_label || action?.label || 'View'}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          {!notification.read && onMarkAsRead && (
            <button
              onClick={onMarkAsRead}
              className="text-sm text-neutral hover:text-neutral-dark transition-colors"
            >
              Mark as read
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-neutral hover:text-error transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for notification list
 */
export function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-neutral-light">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-neutral-light" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-neutral-light rounded mb-2" />
            <div className="h-3 w-full bg-neutral-light rounded mb-2" />
            <div className="h-3 w-1/4 bg-neutral-light rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
