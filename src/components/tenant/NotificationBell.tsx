/**
 * Notification Bell Component
 * Header icon with unread badge and dropdown for quick notification access
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Settings, ChevronRight } from 'lucide-react';
import { useTenantNotifications } from '../../contexts/TenantNotificationContext';
import NotificationList from './NotificationList';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    hasNewNotifications,
    clearNewNotificationFlag,
  } = useTenantNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear new notification flag when dropdown opens
  useEffect(() => {
    if (isOpen && hasNewNotifications) {
      clearNewNotificationFlag();
    }
  }, [isOpen, hasNewNotifications, clearNewNotificationFlag]);

  // Get recent notifications for dropdown (max 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${isOpen ? 'bg-neutral-lightest' : 'hover:bg-neutral-lightest'}
          ${hasNewNotifications ? 'animate-pulse' : ''}
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 text-neutral-dark" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-error rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* New Notification Pulse */}
        {hasNewNotifications && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-neutral-light overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-light bg-neutral-lightest">
            <h3 className="font-semibold text-neutral-darkest">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-neutral-light rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-neutral-light rounded mb-2" />
                      <div className="h-3 w-full bg-neutral-light rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-neutral-light mx-auto mb-3" />
                <p className="text-neutral-dark font-medium">No notifications</p>
                <p className="text-sm text-neutral mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <NotificationList
                notifications={recentNotifications}
                compact
                onNotificationClick={() => setIsOpen(false)}
              />
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-neutral-light">
              <Link
                to="/tenant/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-primary hover:bg-neutral-lightest transition-colors"
              >
                View all notifications
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact notification bell for mobile nav
 */
export function NotificationBellCompact() {
  const { unreadCount, hasNewNotifications } = useTenantNotifications();

  return (
    <Link
      to="/tenant/notifications"
      className="relative p-2"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className={`h-6 w-6 ${hasNewNotifications ? 'text-primary' : 'text-neutral-dark'}`} />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-error rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
