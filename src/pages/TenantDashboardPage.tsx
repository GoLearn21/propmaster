/**
 * Tenant Dashboard Page - "The Concierge"
 *
 * Titanium Precision Design System
 * Inspiration: Airbnb + Wealthfront
 *
 * Features:
 * - Large, tappable cards with squircle corners
 * - Reassuring payment status indicators
 * - Chat-like maintenance request preview
 * - Warm, welcoming aesthetic
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  Bell,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { BentoGrid, BentoItem } from '../components/dashboard/BentoGrid';
import { useRequireTenantAuth } from '../contexts/TenantAuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '@/lib/utils';

/**
 * Interface definitions
 */
interface RentSummary {
  current_balance: number;
  next_due_date: string;
  next_due_amount: number;
  days_until_due: number;
  autopay_enabled: boolean;
  payment_status: 'paid' | 'upcoming' | 'overdue';
}

interface MaintenanceRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

/**
 * Tenant Dashboard Page Component
 */
export default function TenantDashboardPage() {
  const { tenant, loading: authLoading } = useRequireTenantAuth();

  const [rentSummary, setRentSummary] = useState<RentSummary | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      fetchDashboardData();
    }
  }, [tenant]);

  const fetchDashboardData = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchRentSummary(),
        fetchMaintenanceRequests(),
        fetchNotifications(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRentSummary = async () => {
    if (!tenant) return;

    try {
      const { data: lease } = await supabase
        .from('leases')
        .select('*, units(*), payment_templates(*)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .single();

      if (lease) {
        const today = new Date();
        const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        setRentSummary({
          current_balance: tenant.balance_due || 0,
          next_due_date: nextDueDate.toISOString(),
          next_due_amount: lease.monthly_rent || 0,
          days_until_due: daysUntilDue,
          autopay_enabled: !!lease.payment_templates?.length,
          payment_status: tenant.balance_due > 0 ? 'overdue' : daysUntilDue <= 7 ? 'upcoming' : 'paid',
        });
      }
    } catch (error) {
      console.error('Error fetching rent summary:', error);
    }
  };

  const fetchMaintenanceRequests = async () => {
    if (!tenant) return;

    try {
      const { data: requests } = await supabase
        .from('work_orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requests) {
        setMaintenanceRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!tenant) return;

    try {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', tenant.user_id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifs) {
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: 'success' as const, label: 'All Paid', icon: CheckCircle2 };
      case 'upcoming':
        return { variant: 'warning' as const, label: 'Due Soon', icon: Clock };
      case 'overdue':
        return { variant: 'error' as const, label: 'Overdue', icon: AlertCircle };
      default:
        return { variant: 'default' as const, label: 'Unknown', icon: Clock };
    }
  };

  const getMaintenanceStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { variant: 'success' as const, label: 'Completed', color: 'text-status-success' };
      case 'in_progress':
        return { variant: 'info' as const, label: 'In Progress', color: 'text-status-info' };
      case 'pending':
        return { variant: 'warning' as const, label: 'Pending', color: 'text-status-warning' };
      default:
        return { variant: 'default' as const, label: status, color: 'text-text-secondary' };
    }
  };

  // Loading state with warm styling
  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-surface-primary dark:bg-dark-surface-primary flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark animate-pulse mx-auto" />
            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-accent-green animate-bounce" />
          </div>
          <p className="mt-4 text-text-secondary font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const paymentStatus = rentSummary ? getPaymentStatusConfig(rentSummary.payment_status) : null;
  const PaymentIcon = paymentStatus?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {tenant?.first_name}!
          </h1>
          <p className="text-text-secondary mt-1">
            Here's what's happening with your rental
          </p>
        </div>
        <Link to="/tenant/profile">
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
            View Profile
          </Button>
        </Link>
      </div>

      {/* Hero Card - Rent Due */}
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className={cn(
          'p-6 md:p-8',
          rentSummary?.payment_status === 'overdue'
            ? 'bg-gradient-to-br from-status-error/5 to-status-error/10'
            : rentSummary?.payment_status === 'upcoming'
            ? 'bg-gradient-to-br from-status-warning/5 to-status-warning/10'
            : 'bg-gradient-to-br from-status-success/5 to-status-success/10'
        )}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center',
                  rentSummary?.payment_status === 'overdue'
                    ? 'bg-status-error/10'
                    : rentSummary?.payment_status === 'upcoming'
                    ? 'bg-status-warning/10'
                    : 'bg-status-success/10'
                )}>
                  <PaymentIcon className={cn(
                    'h-6 w-6',
                    rentSummary?.payment_status === 'overdue'
                      ? 'text-status-error'
                      : rentSummary?.payment_status === 'upcoming'
                      ? 'text-status-warning'
                      : 'text-status-success'
                  )} />
                </div>
                {paymentStatus && (
                  <StatusBadge status={paymentStatus.variant} size="md" dot>
                    {paymentStatus.label}
                  </StatusBadge>
                )}
              </div>
              <p className="text-sm font-medium text-text-secondary mb-1">
                {rentSummary?.current_balance && rentSummary.current_balance > 0
                  ? 'Current Balance Due'
                  : 'Next Payment Due'}
              </p>
              <p className="text-4xl font-bold text-text-primary font-tabular">
                ${rentSummary?.current_balance && rentSummary.current_balance > 0
                  ? rentSummary.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : rentSummary?.next_due_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              {rentSummary && rentSummary.days_until_due > 0 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                  <Calendar className="h-4 w-4" />
                  <span>Due in {rentSummary.days_until_due} days</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/tenant/payments">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<CreditCard className="h-5 w-5" />}
                  className="w-full sm:w-auto shadow-lg"
                >
                  Pay Rent
                </Button>
              </Link>
              <Link to="/tenant/payments/history">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Payment History
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Autopay Status */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {rentSummary?.autopay_enabled ? (
                <>
                  <div className="h-8 w-8 rounded-lg bg-status-success/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-status-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">AutoPay Enabled</p>
                    <p className="text-xs text-text-tertiary">Your rent will be paid automatically</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-lg bg-status-warning/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Enable AutoPay</p>
                    <p className="text-xs text-text-tertiary">Never miss a payment</p>
                  </div>
                </>
              )}
            </div>
            <Link to="/tenant/payments/methods">
              <Button variant="ghost" size="sm">
                {rentSummary?.autopay_enabled ? 'Manage' : 'Set Up'}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Requests */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-status-warning/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-status-warning" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">Maintenance</h2>
                  <p className="text-xs text-text-tertiary">Track your requests</p>
                </div>
              </div>
              <Link to="/tenant/maintenance">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  View All
                </Button>
              </Link>
            </div>
          </div>

          {maintenanceRequests.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {maintenanceRequests.slice(0, 3).map((request) => {
                const statusConfig = getMaintenanceStatusConfig(request.status);
                return (
                  <Link
                    key={request.id}
                    to={`/tenant/maintenance/${request.id}`}
                    className="block p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{request.title}</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Submitted {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={statusConfig.variant} size="sm">
                        {statusConfig.label}
                      </StatusBadge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <Wrench className="h-6 w-6 text-text-muted" />
              </div>
              <p className="text-text-secondary font-medium">No maintenance requests</p>
              <p className="text-xs text-text-tertiary mt-1">Everything looking good!</p>
            </div>
          )}

          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
            <Link to="/tenant/maintenance/new">
              <Button variant="outline" className="w-full" leftIcon={<Wrench className="h-4 w-4" />}>
                New Request
              </Button>
            </Link>
          </div>
        </Card>

        {/* Notifications */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-status-info/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-status-info" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">Notifications</h2>
                  <p className="text-xs text-text-tertiary">Stay updated</p>
                </div>
              </div>
              <Link to="/tenant/notifications">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  View All
                </Button>
              </Link>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{notification.title}</p>
                      <p className="text-sm text-text-secondary line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-text-muted" />
              </div>
              <p className="text-text-secondary font-medium">All caught up!</p>
              <p className="text-xs text-text-tertiary mt-1">No new notifications</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Lease', description: 'View your lease', href: '/tenant/documents', color: 'text-primary' },
          { icon: CreditCard, label: 'Payments', description: 'Manage payments', href: '/tenant/payments', color: 'text-accent-green' },
          { icon: Wrench, label: 'Maintenance', description: 'Track requests', href: '/tenant/maintenance', color: 'text-status-warning' },
          { icon: User, label: 'Profile', description: 'Update info', href: '/tenant/profile', color: 'text-status-info' },
        ].map((action) => (
          <Link key={action.href} to={action.href}>
            <Card
              variant="default"
              padding="md"
              hoverable
              className="h-full transition-all duration-200 hover:-translate-y-1"
            >
              <div className={cn(
                'h-11 w-11 rounded-xl flex items-center justify-center mb-3',
                'bg-neutral-100 dark:bg-neutral-800'
              )}>
                <action.icon className={cn('h-5 w-5', action.color)} />
              </div>
              <p className="font-semibold text-text-primary">{action.label}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{action.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
