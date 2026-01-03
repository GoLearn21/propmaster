import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentOverview } from './PaymentOverview';
import { PaymentMetrics } from '../types';

describe('PaymentOverview', () => {
  const mockMetrics: PaymentMetrics = {
    totalRevenue: 1247890,
    monthlyRevenue: 89750,
    outstandingBalance: 34280,
    collectionRate: 0.946,
    pendingPayments: 23,
    overdueAmount: 15420,
    paidThisMonth: 74330
  };

  it('renders payment overview title', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('Payment Overview')).toBeInTheDocument();
  });

  it('displays all metric cards with correct values', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('$1,247,890')).toBeInTheDocument();
    expect(screen.getByText('$89,750')).toBeInTheDocument();
    expect(screen.getByText('$34,280')).toBeInTheDocument();
    expect(screen.getByText('94.6%')).toBeInTheDocument();
  });

  it('shows loading state with placeholders', () => {
    render(<PaymentOverview metrics={null} loading={true} filters={{}} />);
    
    // Should show 4 loading placeholders (primary metrics)
    const loadingElements = screen.getAllByTestId('loading-placeholder');
    expect(loadingElements).toHaveLength(4);
  });

  it('displays metric card titles', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Balance')).toBeInTheDocument();
    expect(screen.getByText('Collection Rate')).toBeInTheDocument();
  });

  it('shows secondary metrics section', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('Additional Metrics')).toBeInTheDocument();
    expect(screen.getByText('Pending Payments')).toBeInTheDocument();
    expect(screen.getByText('Paid This Month')).toBeInTheDocument();
    expect(screen.getByText('Overdue Amount')).toBeInTheDocument();
  });

  it('displays quick stats with proper values', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);

    expect(screen.getByText('127')).toBeInTheDocument(); // Active Tenants
    expect(screen.getAllByText('23').length).toBeGreaterThan(0); // Properties (may appear multiple times)
    expect(screen.getByText('1st')).toBeInTheDocument(); // Next Billing Day
    expect(screen.getByText('95.8%')).toBeInTheDocument(); // Target Collection Rate
  });

  it('shows recent activity summary', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('Recent Activity Summary')).toBeInTheDocument();
    expect(screen.getByText('View All Activity →')).toBeInTheDocument();
    expect(screen.getByText('Payments Today')).toBeInTheDocument();
    expect(screen.getByText('Overdue Notices')).toBeInTheDocument();
    expect(screen.getByText('Failed Payments')).toBeInTheDocument();
  });

  it('displays payment trends chart', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('Payment Trends (Last 6 Months)')).toBeInTheDocument();
    
    // Check for chart months
    expect(screen.getByText('Jul')).toBeInTheDocument();
    expect(screen.getByText('Aug')).toBeInTheDocument();
    expect(screen.getByText('Sep')).toBeInTheDocument();
    expect(screen.getByText('Oct')).toBeInTheDocument();
    expect(screen.getByText('Nov')).toBeInTheDocument();
    expect(screen.getByText('Dec')).toBeInTheDocument();
  });

  it('shows positive change indicators', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    // Should show positive change indicators
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('+8.2%')).toBeInTheDocument();
    expect(screen.getByText('+2.4%')).toBeInTheDocument();
  });

  it('applies correct color styling for different metrics', () => {
    const { container } = render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    // Check for color classes
    const greenElements = container.querySelectorAll('.text-accent-green');
    expect(greenElements.length).toBeGreaterThan(0);
    
    const primaryElements = container.querySelectorAll('.text-primary');
    expect(primaryElements.length).toBeGreaterThan(0);
    
    const pinkElements = container.querySelectorAll('.text-accent-pink');
    expect(pinkElements.length).toBeGreaterThan(0);
  });

  it('handles null metrics gracefully', () => {
    render(<PaymentOverview metrics={null} loading={false} filters={{}} />);
    
    // Should not crash and show loading state instead
    expect(screen.queryByText('$1,247,890')).not.toBeInTheDocument();
  });

  it('displays proper status badges', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);

    // Status badges with their values
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows proper card hover effects', () => {
    const { container } = render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    // Check for hover effect classes
    const hoverCards = container.querySelectorAll('.hover\\:shadow-lg');
    expect(hoverCards.length).toBeGreaterThan(0);
  });

  it('formats currency values correctly', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    // Check for formatted currency
    expect(screen.getByText('$1,247,890')).toBeInTheDocument();
    expect(screen.getByText('$89,750')).toBeInTheDocument();
    expect(screen.getByText('$34,280')).toBeInTheDocument();
    expect(screen.getByText('$74,330')).toBeInTheDocument();
  });

  it('displays percentage values correctly', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('94.6%')).toBeInTheDocument();
  });

  it('shows descriptive text for each metric', () => {
    render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    expect(screen.getByText('All-time collection total')).toBeInTheDocument();
    expect(screen.getByText('Current month collections')).toBeInTheDocument();
    expect(screen.getByText('Total unpaid amounts')).toBeInTheDocument();
    expect(screen.getByText('Payments collected on time')).toBeInTheDocument();
  });

  it('displays correct background colors for summary cards', () => {
    const { container } = render(<PaymentOverview metrics={mockMetrics} loading={false} filters={{}} />);
    
    // Check for primary background
    const primaryBg = container.querySelector('.bg-primary');
    expect(primaryBg).toBeInTheDocument();
  });
});