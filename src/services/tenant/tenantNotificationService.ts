/**
 * Tenant Notification Service
 * Handles CRUD operations and real-time subscriptions for tenant notifications
 */

import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Notification types
 */
export type NotificationType =
  | 'payment_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'maintenance_created'
  | 'maintenance_updated'
  | 'maintenance_completed'
  | 'lease_ready'
  | 'lease_signed'
  | 'lease_renewal'
  | 'document_shared'
  | 'announcement'
  | 'system';

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification interface
 */
export interface TenantNotification {
  id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  priority: NotificationPriority;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification count by category
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Partial<Record<NotificationType, number>>;
}

/**
 * Notification type metadata for UI
 */
export const NOTIFICATION_TYPES: Record<NotificationType, { label: string; icon: string; color: string }> = {
  payment_reminder: { label: 'Payment Reminder', icon: 'clock', color: 'warning' },
  payment_received: { label: 'Payment Received', icon: 'check-circle', color: 'success' },
  payment_failed: { label: 'Payment Failed', icon: 'x-circle', color: 'error' },
  maintenance_created: { label: 'Maintenance Request', icon: 'wrench', color: 'primary' },
  maintenance_updated: { label: 'Maintenance Update', icon: 'refresh-cw', color: 'secondary' },
  maintenance_completed: { label: 'Maintenance Completed', icon: 'check-circle', color: 'success' },
  lease_ready: { label: 'Lease Ready to Sign', icon: 'file-text', color: 'primary' },
  lease_signed: { label: 'Lease Signed', icon: 'check-circle', color: 'success' },
  lease_renewal: { label: 'Lease Renewal', icon: 'calendar', color: 'warning' },
  document_shared: { label: 'Document Shared', icon: 'file', color: 'secondary' },
  announcement: { label: 'Announcement', icon: 'megaphone', color: 'primary' },
  system: { label: 'System', icon: 'info', color: 'neutral' },
};

/**
 * Get all notifications for a tenant
 */
export async function getNotifications(
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType[];
  }
): Promise<TenantNotification[]> {
  let query = supabase
    .from('tenant_notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('read', false);
  }

  if (options?.type && options.type.length > 0) {
    query = query.in('type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options?.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tenant_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get notification counts by type
 */
export async function getNotificationCounts(tenantId: string): Promise<NotificationCounts> {
  const { data, error } = await supabase
    .from('tenant_notifications')
    .select('type, read')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching notification counts:', error);
    return { total: 0, unread: 0, byType: {} };
  }

  const counts: NotificationCounts = {
    total: data?.length || 0,
    unread: data?.filter((n) => !n.read).length || 0,
    byType: {},
  };

  data?.forEach((notification) => {
    const type = notification.type as NotificationType;
    counts.byType[type] = (counts.byType[type] || 0) + 1;
  });

  return counts;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenant_notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenant_notifications')
    .update({ read: true })
    .eq('tenant_id', tenantId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenant_notifications')
    .delete()
    .eq('id', notificationId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete all read notifications
 */
export async function deleteAllRead(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenant_notifications')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('read', true);

  if (error) {
    console.error('Error deleting read notifications:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  tenantId: string,
  onNotification: (notification: TenantNotification) => void,
  onDelete?: (notificationId: string) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`tenant-notifications:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tenant_notifications',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        onNotification(payload.new as TenantNotification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenant_notifications',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        onNotification(payload.new as TenantNotification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'tenant_notifications',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        if (onDelete) {
          onDelete((payload.old as { id: string }).id);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Create a notification (typically called from server/edge functions)
 * This is exposed for testing purposes - in production, notifications
 * should be created via triggers or edge functions
 */
export async function createNotification(
  tenantId: string,
  notification: Omit<TenantNotification, 'id' | 'tenant_id' | 'created_at' | 'read'>
): Promise<{ success: boolean; notification?: TenantNotification; error?: string }> {
  const { data, error } = await supabase
    .from('tenant_notifications')
    .insert({
      tenant_id: tenantId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      action_url: notification.action_url,
      action_label: notification.action_label,
      priority: notification.priority || 'normal',
      metadata: notification.metadata,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true, notification: data };
}

/**
 * Format relative time for notification display
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get action button text based on notification type
 */
export function getNotificationAction(type: NotificationType): { label: string; path: string } | null {
  const actions: Partial<Record<NotificationType, { label: string; path: string }>> = {
    payment_reminder: { label: 'Pay Now', path: '/tenant/payments' },
    payment_failed: { label: 'Retry Payment', path: '/tenant/payments' },
    maintenance_created: { label: 'View Request', path: '/tenant/maintenance' },
    maintenance_updated: { label: 'View Update', path: '/tenant/maintenance' },
    maintenance_completed: { label: 'Rate Service', path: '/tenant/maintenance' },
    lease_ready: { label: 'Sign Lease', path: '/tenant/documents' },
    lease_renewal: { label: 'View Renewal', path: '/tenant/documents' },
    document_shared: { label: 'View Document', path: '/tenant/documents' },
  };

  return actions[type] || null;
}
