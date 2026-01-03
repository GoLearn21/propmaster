/**
 * Tenant Portal Layout - "The Concierge"
 *
 * Titanium Precision Design System
 * Inspiration: Airbnb + Wealthfront
 *
 * Features:
 * - Warm, welcoming aesthetic with squircle corners
 * - Frosted glass vibrancy effects
 * - Large, tappable mobile cards
 * - Simple 4-tab bottom navigation
 * - Reassuring status indicators
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { cn } from '@/lib/utils';
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronRight,
  DollarSign,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

/**
 * Tenant navigation items
 */
const tenantNavItems = [
  {
    name: 'Dashboard',
    path: '/tenant/dashboard',
    icon: Home,
    description: 'Overview & quick actions',
  },
  {
    name: 'Pay Rent',
    path: '/tenant/payments',
    icon: CreditCard,
    description: 'Make payments & autopay',
  },
  {
    name: 'Maintenance',
    path: '/tenant/maintenance',
    icon: Wrench,
    description: 'Submit & track requests',
  },
  {
    name: 'Documents',
    path: '/tenant/documents',
    icon: FileText,
    description: 'Lease & documents',
  },
  {
    name: 'Profile',
    path: '/tenant/profile',
    icon: User,
    description: 'Your information',
  },
  {
    name: 'Settings',
    path: '/tenant/settings',
    icon: Settings,
    description: 'Preferences',
  },
];

/**
 * Mobile bottom navigation items (4 primary + More)
 */
const mobileBottomNavItems = [
  { name: 'Home', path: '/tenant/dashboard', icon: Home },
  { name: 'Pay', path: '/tenant/payments', icon: DollarSign },
  { name: 'Repairs', path: '/tenant/maintenance', icon: Wrench },
  { name: 'Docs', path: '/tenant/documents', icon: FileText },
  { name: 'More', path: '/tenant/profile', icon: Menu },
];

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

interface TenantLayoutProps {
  children?: React.ReactNode;
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const location = useLocation();
  const { tenant, logout, loading: authLoading } = useTenantAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => {
    if (path === '/tenant/dashboard') {
      return location.pathname === '/tenant/dashboard' || location.pathname === '/tenant';
    }
    return location.pathname.startsWith(path);
  };

  /**
   * Fetch notifications and subscribe to real-time updates
   */
  useEffect(() => {
    if (!tenant?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('tenant_notifications')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    };

    fetchNotifications();

    const subscription = supabase
      .channel('tenant_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tenant_notifications',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationItem;
          setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenant?.id]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('tenant_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!tenant?.id) return;

    await supabase
      .from('tenant_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('tenant_id', tenant.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/tenant/login';
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_received':
        return 'text-status-success bg-status-success/10';
      case 'payment_failed':
      case 'payment_reminder':
        return 'text-status-error bg-status-error/10';
      case 'maintenance_completed':
        return 'text-status-info bg-status-info/10';
      case 'maintenance_created':
      case 'maintenance_updated':
        return 'text-status-warning bg-status-warning/10';
      default:
        return 'text-text-secondary bg-neutral-100';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Loading state with warm styling
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-primary dark:bg-dark-surface-primary flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark animate-pulse mx-auto" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-accent-green animate-bounce" />
          </div>
          <p className="mt-4 text-text-secondary font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary dark:bg-dark-surface-primary pb-20 md:pb-0">
      {/* Top Navigation Bar - Frosted Glass */}
      <nav
        className={cn(
          'fixed w-full top-0 z-50',
          'h-16 flex items-center',
          // Frosted glass vibrancy
          'bg-white/80 backdrop-blur-xl backdrop-saturate-[180%]',
          'border-b border-neutral-200/50',
          'dark:bg-neutral-900/80 dark:border-neutral-700/50'
        )}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <Link to="/tenant/dashboard" className="flex items-center group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:-translate-y-0.5">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3 hidden sm:block">
                <span className="text-lg font-bold text-text-primary">MasterKey</span>
                <span className="ml-2 text-sm font-medium text-text-tertiary">Tenant Portal</span>
              </div>
            </Link>

            {/* Desktop Navigation Actions */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Theme Toggle */}
              <ThemeToggle size="md" />

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={cn(
                    'relative p-2 rounded-lg',
                    'text-text-secondary hover:text-text-primary',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    'transition-all duration-200'
                  )}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className={cn(
                      'absolute -top-0.5 -right-0.5',
                      'min-w-[18px] h-[18px] flex items-center justify-center',
                      'px-1 rounded-full',
                      'text-[10px] font-bold text-white',
                      'bg-status-error',
                      'ring-2 ring-white dark:ring-neutral-900'
                    )}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className={cn(
                      'absolute right-0 mt-2 w-80',
                      'bg-white/95 dark:bg-neutral-800/95',
                      'backdrop-blur-xl',
                      'rounded-2xl shadow-xl',
                      'border border-neutral-200/50 dark:border-neutral-700/50',
                      'z-50 overflow-hidden',
                      'animate-scale-in origin-top-right'
                    )}>
                      <div className="p-4 border-b border-neutral-200/50 dark:border-neutral-700/50 flex justify-between items-center">
                        <h3 className="font-semibold text-text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-primary hover:text-primary-dark font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto mb-3">
                              <Bell className="h-6 w-6 text-text-muted" />
                            </div>
                            <p className="text-text-secondary text-sm">No notifications yet</p>
                            <p className="text-text-tertiary text-xs mt-1">We'll notify you when something happens</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <Link
                              key={notification.id}
                              to={notification.action_url || '#'}
                              onClick={() => {
                                if (!notification.read) markAsRead(notification.id);
                                setNotificationsOpen(false);
                              }}
                              className={cn(
                                'block p-4 border-b border-neutral-100 dark:border-neutral-700/50',
                                'hover:bg-neutral-50 dark:hover:bg-neutral-700/50',
                                'transition-colors',
                                !notification.read && 'bg-primary/5'
                              )}
                            >
                              <div className="flex items-start">
                                <div
                                  className={cn(
                                    'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                                    getNotificationColor(notification.type)
                                  )}
                                >
                                  <Bell className="h-4 w-4" />
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary truncate">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-text-secondary line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-text-tertiary mt-1">
                                    {formatRelativeTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-primary rounded-full ml-2 flex-shrink-0 animate-pulse" />
                                )}
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                      <Link
                        to="/tenant/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className={cn(
                          'block p-3 text-center text-sm font-medium',
                          'text-primary hover:text-primary-dark',
                          'hover:bg-neutral-50 dark:hover:bg-neutral-700/50',
                          'border-t border-neutral-200/50 dark:border-neutral-700/50'
                        )}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Help */}
              <button
                className={cn(
                  'p-2 rounded-lg',
                  'text-text-secondary hover:text-text-primary',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-all duration-200'
                )}
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>

              {/* User Info */}
              <div className="flex items-center space-x-3 ml-2">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-text-primary">
                    {tenant?.first_name} {tenant?.last_name}
                  </p>
                  <p className="text-xs text-text-tertiary">{tenant?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-text-secondary hover:text-status-error"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>

            {/* Mobile: Notification + Menu */}
            <div className="flex items-center space-x-1 md:hidden">
              <ThemeToggle size="sm" />

              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={cn(
                  'relative p-2 rounded-lg',
                  'text-text-secondary hover:text-text-primary'
                )}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-status-error text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn(
                  'p-2 rounded-lg',
                  'text-text-secondary hover:text-text-primary',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu - Slide Down */}
        {mobileMenuOpen && (
          <div className={cn(
            'md:hidden absolute top-16 left-0 right-0',
            'bg-white/95 dark:bg-neutral-900/95',
            'backdrop-blur-xl',
            'border-b border-neutral-200/50 dark:border-neutral-700/50',
            'shadow-lg',
            'animate-slide-down'
          )}>
            {/* User Info */}
            <div className="px-4 py-4 border-b border-neutral-200/50 dark:border-neutral-700/50">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-lg">
                  {tenant?.first_name?.[0]}{tenant?.last_name?.[0]}
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-text-primary">
                    {tenant?.first_name} {tenant?.last_name}
                  </p>
                  <p className="text-sm text-text-tertiary">{tenant?.email}</p>
                </div>
              </div>
            </div>

            <div className="px-3 py-3 space-y-1">
              {tenantNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl',
                      'transition-all duration-200',
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    )}
                  >
                    <div className="flex items-center">
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center mr-3',
                        isActive(item.path)
                          ? 'bg-primary/10'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          isActive(item.path) ? 'text-primary' : 'text-text-secondary'
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-text-tertiary">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center px-4 py-3 rounded-xl',
                  'text-status-error hover:bg-status-error/10',
                  'transition-all duration-200 mt-2'
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-status-error/10 flex items-center justify-center mr-3">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex pt-16">
        {/* Sidebar Navigation (Desktop) - Frosted Glass */}
        <aside className={cn(
          'hidden md:block w-64 fixed h-[calc(100vh-4rem)]',
          'bg-white/80 dark:bg-neutral-900/80',
          'backdrop-blur-xl backdrop-saturate-[180%]',
          'border-r border-neutral-200/50 dark:border-neutral-700/50',
          'overflow-y-auto'
        )}>
          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {tenantNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-xl',
                      'text-sm font-medium',
                      'transition-all duration-200',
                      'relative',
                      active
                        ? [
                            'bg-primary/10 text-primary',
                            'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                            'before:w-1 before:h-8 before:bg-primary before:rounded-r',
                          ].join(' ')
                        : 'text-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-text-primary'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5 mr-3',
                      active ? 'text-primary' : 'text-text-tertiary'
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Quick Pay Card - Warm Gradient */}
          <div className="mt-8 mx-3 p-5 bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white shadow-lg">
            <div className="flex items-center mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="ml-3 font-semibold text-lg">Quick Pay</span>
            </div>
            <p className="text-sm text-white/80 mb-4">
              Pay your rent securely in seconds
            </p>
            <Link
              to="/tenant/payments"
              className={cn(
                'block w-full py-2.5 px-4',
                'bg-white text-primary font-semibold',
                'rounded-xl text-center',
                'hover:bg-white/90 hover:-translate-y-0.5',
                'transition-all duration-200',
                'shadow-md'
              )}
            >
              Pay Now
            </Link>
          </div>

          {/* Tenant Info Card */}
          {tenant && (
            <div className="mt-4 mx-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <div className="flex items-center">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-semibold shadow-md">
                  {tenant.first_name?.[0]}{tenant.last_name?.[0]}
                </div>
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {tenant.first_name} {tenant.last_name}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">{tenant.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Help Link */}
          <div className="absolute bottom-4 left-3 right-3">
            <Link
              to="/tenant/help"
              className={cn(
                'flex items-center px-4 py-2.5 rounded-xl',
                'text-sm text-text-tertiary',
                'hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-all duration-200'
              )}
            >
              <HelpCircle className="h-4 w-4 mr-3" />
              Help & Support
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 flex-1 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Rounded Pill Style */}
      <nav className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 dark:bg-neutral-900/95',
        'backdrop-blur-xl',
        'border-t border-neutral-200/50 dark:border-neutral-700/50',
        'pb-safe'
      )}>
        <div className="grid grid-cols-5 h-16 px-2">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center py-2',
                  'transition-all duration-200',
                  active
                    ? 'text-primary'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center',
                  'transition-all duration-200',
                  active && 'bg-primary/10'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    active ? 'text-primary' : 'text-current'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium mt-0.5',
                  active ? 'text-primary' : 'text-current'
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
