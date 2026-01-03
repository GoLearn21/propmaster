/**
 * Tenant Notification Context
 * Provides global notification state with real-time updates
 * Manages unread count, notification list, and real-time subscriptions
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useTenantAuth } from './TenantAuthContext';
import {
  TenantNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
} from '../services/tenant/tenantNotificationService';

/**
 * Context interface
 */
interface TenantNotificationContextType {
  notifications: TenantNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
  hasNewNotifications: boolean;
  clearNewNotificationFlag: () => void;
}

/**
 * Create context
 */
const TenantNotificationContext = createContext<TenantNotificationContextType | undefined>(undefined);

/**
 * Provider component
 */
export function TenantNotificationProvider({ children }: { children: React.ReactNode }) {
  const { tenant, isAuthenticated } = useTenantAuth();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Load notifications
   */
  const loadNotifications = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [notificationsData, count] = await Promise.all([
        getNotifications(tenant.id, { limit: 50 }),
        getUnreadCount(tenant.id),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  /**
   * Initialize and subscribe to real-time updates
   */
  useEffect(() => {
    if (!isAuthenticated || !tenant?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Load initial data
    loadNotifications();

    // Subscribe to real-time updates
    channelRef.current = subscribeToNotifications(
      tenant.id,
      (notification) => {
        // Handle new or updated notification
        setNotifications((prev) => {
          const existingIndex = prev.findIndex((n) => n.id === notification.id);
          if (existingIndex >= 0) {
            // Update existing notification
            const updated = [...prev];
            updated[existingIndex] = notification;
            return updated;
          } else {
            // Add new notification at the top
            setHasNewNotifications(true);
            return [notification, ...prev];
          }
        });

        // Update unread count for new notifications
        if (!notification.read) {
          setUnreadCount((prev) => {
            // Only increment if it's a new notification (not update)
            const isNew = !notifications.find((n) => n.id === notification.id);
            return isNew ? prev + 1 : prev;
          });
        }
      },
      (notificationId) => {
        // Handle deleted notification
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, tenant?.id, loadNotifications]);

  /**
   * Mark a notification as read
   */
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (!tenant?.id) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const result = await markAsRead(notificationId, tenant.id);

    if (!result.success) {
      // Revert on failure
      await loadNotifications();
    }
  }, [tenant?.id, loadNotifications]);

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    if (!tenant?.id) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const result = await markAllAsRead(tenant.id);

    if (!result.success) {
      // Revert on failure
      await loadNotifications();
    }
  }, [tenant?.id, loadNotifications]);

  /**
   * Delete a notification
   */
  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    if (!tenant?.id) return;

    // Find the notification to check if it was unread
    const notification = notifications.find((n) => n.id === notificationId);
    const wasUnread = notification && !notification.read;

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    const result = await deleteNotification(notificationId, tenant.id);

    if (!result.success) {
      // Revert on failure
      await loadNotifications();
    }
  }, [tenant?.id, notifications, loadNotifications]);

  /**
   * Clear new notification flag (when user opens notification dropdown)
   */
  const clearNewNotificationFlag = useCallback(() => {
    setHasNewNotifications(false);
  }, []);

  const value: TenantNotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    refresh: loadNotifications,
    hasNewNotifications,
    clearNewNotificationFlag,
  };

  return (
    <TenantNotificationContext.Provider value={value}>
      {children}
    </TenantNotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useTenantNotifications(): TenantNotificationContextType {
  const context = useContext(TenantNotificationContext);
  if (context === undefined) {
    throw new Error('useTenantNotifications must be used within a TenantNotificationProvider');
  }
  return context;
}

/**
 * Hook to get just the unread count (for performance when only count is needed)
 */
export function useUnreadCount(): number {
  const { unreadCount } = useTenantNotifications();
  return unreadCount;
}
