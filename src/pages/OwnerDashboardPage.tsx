/**
 * Owner Dashboard Page - "The Boardroom"
 *
 * Titanium Precision Design System
 * Color Accent: Emerald (#10B981)
 *
 * Features:
 * - Financial summary cards with sparklines
 * - Property performance comparison
 * - Distribution/payout status
 * - Tax document access
 * - Executive-level portfolio overview
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRequireOwnerAuth } from '../contexts/OwnerAuthContext';
import { getOwnerFinancialReports } from '../services/ownerAuthService';
import { supabase } from '../lib/supabase';
import OwnerLayout from '../layouts/OwnerLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { BentoGrid, BentoItem } from '../components/dashboard/BentoGrid';
import { Sparkline, TrendIndicator } from '../components/dashboard/Sparkline';
import { cn } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  ArrowRight,
  PieChart,
  BarChart3,
  Calendar,
  FileText,
  Percent,
  Wallet,
  Home,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const { owner } = useRequireOwnerAuth();
  const [financialData, setFinancialData] = useState<any>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<{
    occupancyRate: number;
    collectionRate: number;
  }>({ occupancyRate: 0, collectionRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (owner) {
      loadFinancialData();
    }
  }, [owner]);

  const loadFinancialData = async () => {
    if (!owner) return;

    try {
      setLoading(true);

      // Fetch financial reports
      const data = await getOwnerFinancialReports(owner.id, 'monthly');
      setFinancialData(data);

      // CRITICAL FIX: Fetch real occupancy and collection rates from database
      // instead of using hardcoded values
      const { data: ownerProperties } = await supabase
        .from('property_ownership')
        .select('property_id')
        .eq('owner_id', owner.id);

      if (ownerProperties && ownerProperties.length > 0) {
        const propertyIds = ownerProperties.map(p => p.property_id);

        // Calculate real occupancy rate
        const { data: units } = await supabase
          .from('units')
          .select('id, status')
          .in('property_id', propertyIds);

        const totalUnits = units?.length || 0;
        const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        // Calculate real collection rate from payments
        const { data: payments } = await supabase
          .from('payments')
          .select('status')
          .in('lease.property_id', propertyIds);

        const totalPayments = payments?.length || 0;
        const collectedPayments = payments?.filter(p => p.status === 'paid').length || 0;
        const collectionRate = totalPayments > 0 ? (collectedPayments / totalPayments) * 100 : 0;

        setPortfolioMetrics({
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          collectionRate: Math.round(collectionRate * 10) / 10,
        });
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mock sparkline data for trends
  const revenueSparkline = useMemo(() => {
    const base = financialData?.total_revenue || 12500;
    return [base * 0.85, base * 0.92, base * 0.88, base * 0.95, base * 0.98, base * 1.02, base];
  }, [financialData]);

  const incomeSparkline = useMemo(() => {
    const base = financialData?.net_income || 8200;
    return [base * 0.9, base * 0.88, base * 0.92, base * 0.95, base * 0.93, base * 0.98, base];
  }, [financialData]);

  // Use real metrics from database (via loadFinancialData)
  const { occupancyRate, collectionRate } = portfolioMetrics;

  return (
    <OwnerLayout>
      <div className="space-y-6 p-6 lg:p-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {owner?.first_name}!
            </h1>
            <p className="text-text-secondary mt-1">
              Here's an overview of your property portfolio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/owner/financial-reports">
              <Button variant="outline" size="md" leftIcon={<FileText className="h-4 w-4" />}>
                Reports
              </Button>
            </Link>
            <Link to="/owner/tax-reports">
              <Button variant="primary" size="md" leftIcon={<Download className="h-4 w-4" />}>
                Download 1099
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Metrics - Bento Grid */}
        <BentoGrid columns={4} gap="md">
          {/* Total Revenue - Large Card */}
          <BentoItem colSpan={2} variant="gradient" className="relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-text-secondary">Monthly Revenue</p>
                <p className="text-4xl font-bold text-text-primary mt-2 font-tabular">
                  {formatCurrency(financialData?.total_revenue || 12500)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="success" dot size="sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8.3%
                  </Badge>
                  <span className="text-sm text-text-tertiary">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-accent-green/10">
                <DollarSign className="h-6 w-6 text-accent-green" />
              </div>
            </div>
            <Sparkline
              data={revenueSparkline}
              variant="area"
              color="success"
              width={300}
              height={60}
              className="absolute bottom-0 left-0 right-0 opacity-50"
            />
          </BentoItem>

          {/* Net Income */}
          <BentoItem variant="gradient">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">Net Income</p>
              <div className="p-2 rounded-lg bg-status-success/10">
                <Wallet className="h-5 w-5 text-status-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-tabular">
              {formatCurrency(financialData?.net_income || 8200)}
            </p>
            <TrendIndicator data={incomeSparkline} className="mt-3" />
          </BentoItem>

          {/* Occupancy Rate */}
          <BentoItem variant="gradient">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">Occupancy</p>
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-tabular">
              {occupancyRate}%
            </p>
            <Badge variant="success" size="sm" className="mt-3">
              Above market avg
            </Badge>
          </BentoItem>
        </BentoGrid>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Properties</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  {owner?.owned_properties?.length || 3}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-status-info/10">
                <Home className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Total Units</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  {owner?.total_units || 12}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-pink/10">
                <Users className="h-5 w-5 text-accent-pink" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Active Tenants</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  {Math.round((owner?.total_units || 12) * 0.945)}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-status-success/10">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Collection Rate</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  {collectionRate}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Property Performance & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Performance */}
          <Card variant="elevated" padding="none" className="overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Property Performance</h2>
                  <p className="text-sm text-text-tertiary mt-0.5">Monthly revenue by property</p>
                </div>
                <Link to="/owner/performance">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Details
                  </Button>
                </Link>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[
                { name: 'Sunrise Apartments', units: 6, revenue: 4800, trend: 5.2 },
                { name: 'Oak Street Complex', units: 4, revenue: 3200, trend: 3.8 },
                { name: 'Maple Court', units: 2, revenue: 2400, trend: -1.2 },
              ].map((property, index) => (
                <div key={index} className="p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-accent-green" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{property.name}</p>
                        <p className="text-sm text-text-tertiary">{property.units} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text-primary font-tabular">
                        {formatCurrency(property.revenue)}
                      </p>
                      <div className={cn(
                        'flex items-center gap-1 text-xs font-medium',
                        property.trend >= 0 ? 'text-status-success' : 'text-status-error'
                      )}>
                        {property.trend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(property.trend)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Distribution Status */}
          <Card variant="elevated" padding="none" className="overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Distribution Status</h2>
                  <p className="text-sm text-text-tertiary mt-0.5">Recent payouts & pending</p>
                </div>
                <Link to="/owner/income-expenses">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    History
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {/* Next Distribution */}
              <div className="bg-gradient-to-br from-accent-green/5 to-accent-green/10 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-text-secondary">Next Distribution</p>
                  <StatusBadge status="info" size="sm" dot>Scheduled</StatusBadge>
                </div>
                <p className="text-3xl font-bold text-text-primary font-tabular mb-2">
                  {formatCurrency(7850)}
                </p>
                <div className="flex items-center gap-2 text-sm text-text-tertiary">
                  <Calendar className="h-4 w-4" />
                  <span>January 15, 2025</span>
                </div>
              </div>

              {/* Recent Distributions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-text-secondary">Recent Payouts</p>
                {[
                  { date: 'Dec 15, 2024', amount: 7620, status: 'completed' },
                  { date: 'Nov 15, 2024', amount: 7480, status: 'completed' },
                  { date: 'Oct 15, 2024', amount: 7200, status: 'completed' },
                ].map((payout, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-status-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                      </div>
                      <span className="text-sm text-text-secondary">{payout.date}</span>
                    </div>
                    <span className="font-semibold text-text-primary font-tabular">
                      {formatCurrency(payout.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <BentoItem variant="default" className="border border-neutral-200 dark:border-neutral-700">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
            <p className="text-sm text-text-tertiary mt-0.5">Access key reports and features</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: BarChart3, label: 'Financial Reports', href: '/owner/financial-reports', color: 'text-accent-green' },
              { icon: Building2, label: 'Properties', href: '/owner/properties', color: 'text-primary' },
              { icon: Download, label: 'Tax Documents', href: '/owner/tax-reports', color: 'text-status-warning' },
              { icon: PieChart, label: 'Performance', href: '/owner/performance', color: 'text-status-info' },
            ].map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl',
                  'bg-neutral-50 dark:bg-neutral-800',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  'transition-all duration-200 hover:-translate-y-0.5',
                  'group'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  'bg-white dark:bg-neutral-900',
                  'shadow-sm group-hover:shadow-md',
                  'transition-all duration-200'
                )}>
                  <action.icon className={cn('h-5 w-5', action.color)} />
                </div>
                <span className="text-sm font-medium text-text-secondary text-center">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </BentoItem>

        {/* Portfolio Health Indicators */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Portfolio Health</h2>
            <Badge variant="success" size="md">Excellent</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Occupancy</span>
                <span className="text-sm font-semibold text-text-primary">{occupancyRate}%</span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-success rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Collection Rate</span>
                <span className="text-sm font-semibold text-text-primary">{collectionRate}%</span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-success rounded-full transition-all duration-500"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Maintenance Response</span>
                <span className="text-sm font-semibold text-text-primary">96%</span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-success rounded-full transition-all duration-500"
                  style={{ width: '96%' }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </OwnerLayout>
  );
}
