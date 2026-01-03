/**
 * Tenant Notifications Page
 * Full notification history with filtering and bulk actions
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  Trash2,
  Filter,
  ArrowLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import { useTenantNotifications } from '../../contexts/TenantNotificationContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { NotificationItem, NotificationListSkeleton } from '../../components/tenant/NotificationList';
import {
  NotificationType,
  NOTIFICATION_TYPES,
} from '../../services/tenant/tenantNotificationService';

type FilterType = 'all' | 'unread' | NotificationType;

export default function TenantNotificationsPage() {
  const { tenant } = useRequireTenantAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useTenantNotifications();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: typeof notifications } = {};

    filteredNotifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else if (date > new Date(today.setDate(today.getDate() - 7))) {
        key = 'This Week';
      } else {
        key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  // Filter tabs
  const filterTabs: Array<{ value: FilterType; label: string; count?: number }> = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
  ];

  // Type filters
  const typeFilters = Object.entries(NOTIFICATION_TYPES).map(([type, info]) => ({
    value: type as NotificationType,
    label: info.label,
    count: notifications.filter((n) => n.type === type).length,
  })).filter((f) => f.count > 0);

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/tenant/dashboard"
            className="inline-flex items-center text-sm text-neutral hover:text-neutral-dark transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Notifications</h1>
              <p className="text-neutral-dark mt-1">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'You\'re all caught up!'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-neutral-lightest' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${filter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-dark hover:bg-neutral-lightest border border-neutral-light'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${filter === tab.value
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-lightest text-neutral'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type Filters Panel */}
        {showFilters && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-neutral-darkest">Filter by type</h3>
              {filter !== 'all' && filter !== 'unread' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((typeFilter) => (
                <button
                  key={typeFilter.value}
                  onClick={() => setFilter(typeFilter.value)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors
                    ${filter === typeFilter.value
                      ? 'bg-primary text-white'
                      : 'bg-neutral-lightest text-neutral-dark hover:bg-neutral-light'
                    }
                  `}
                >
                  {typeFilter.label}
                  <span className={`
                    text-xs
                    ${filter === typeFilter.value ? 'text-white/70' : 'text-neutral'}
                  `}>
                    {typeFilter.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Notification List */}
        {loading ? (
          <Card className="overflow-hidden">
            <NotificationListSkeleton count={5} />
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-lightest mb-4">
              <Bell className="h-8 w-8 text-neutral" />
            </div>
            <h3 className="text-lg font-medium text-neutral-darkest mb-2">
              {filter === 'unread'
                ? 'No unread notifications'
                : filter !== 'all'
                ? `No ${NOTIFICATION_TYPES[filter as NotificationType]?.label.toLowerCase()} notifications`
                : 'No notifications yet'}
            </h3>
            <p className="text-neutral-dark">
              {filter === 'unread'
                ? 'You\'ve read all your notifications!'
                : 'When you receive notifications, they\'ll appear here.'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('all')}
                className="mt-4"
              >
                View all notifications
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
              <div key={group}>
                {/* Group Header */}
                <h3 className="text-sm font-medium text-neutral mb-3 px-1">
                  {group}
                </h3>

                {/* Notifications */}
                <div className="space-y-3">
                  {groupNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={
                        notification.read ? undefined : () => markAsRead(notification.id)
                      }
                      onDelete={() => deleteNotification(notification.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More (if needed in future) */}
        {filteredNotifications.length >= 50 && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => refresh()}>
              Load More
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
