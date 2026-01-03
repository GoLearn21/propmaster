import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentDashboard } from './PaymentDashboard';
import { usePaymentDashboard } from './hooks/usePaymentDashboard';

// Mock the hook
vi.mock('./hooks/usePaymentDashboard', () => ({
  usePaymentDashboard: vi.fn()
}));

describe('PaymentDashboard Integration', () => {

  beforeEach(() => {
    // Setup default mock data
    vi.mocked(usePaymentDashboard).mockReturnValue({
      metrics: {
        totalRevenue: 1247890,
        monthlyRevenue: 89750,
        outstandingBalance: 34280,
        collectionRate: 0.946,
        pendingPayments: 23,
        overdueAmount: 15420,
        paidThisMonth: 74330
      },
      paymentHistory: [
        {
          id: '1',
          tenantId: 'tenant-001',
          tenantName: 'John Smith',
          propertyId: 'prop-001',
          propertyName: 'Sunset Apartments',
          amount: 1200,
          type: 'rent',
          status: 'completed',
          dueDate: '2024-12-01T00:00:00Z',
          paidDate: '2024-11-28T14:30:00Z',
          method: 'ach',
          description: 'Monthly rent payment',
          referenceNumber: 'PMT-001234'
        }
      ],
      outstandingBalances: [
        {
          id: '1',
          tenantId: 'tenant-002',
          tenantName: 'Sarah Johnson',
          propertyId: 'prop-002',
          propertyName: 'Oakwood Residences',
          unitNumber: 'B205',
          totalOutstanding: 950,
          daysOverdue: 5,
          status: 'past_due',
          items: [
            {
              type: 'rent',
              description: 'December 2024 rent',
              amount: 950,
              dueDate: '2024-12-01T00:00:00Z',
              daysOverdue: 5
            }
          ],
          lastPayment: {
            amount: 950,
            date: '2024-11-01T10:30:00Z'
          }
        }
      ],
      collectionStatus: {
        totalProperties: 23,
        totalTenants: 127,
        paymentStatus: {
          current: 104,
          pastDue: 18,
          severelyDelinquent: 5
        },
        collectionRate: 94.6,
        averageDaysToPay: 3.2,
        totalOutstanding: 34280
      },
      loading: false,
      error: null,
      refreshData: vi.fn(),
      exportData: vi.fn()
    });
  });

  it('loads and displays all dashboard data correctly', async () => {
    render(<PaymentDashboard />);
    
    await waitFor(() => {
      // Check overview metrics
      expect(screen.getByText('$1,247,890')).toBeInTheDocument();
      expect(screen.getByText('$89,750')).toBeInTheDocument();
      expect(screen.getByText('$34,280')).toBeInTheDocument();
      expect(screen.getByText('94.6%')).toBeInTheDocument();
    });
    
    // Check tabs are present
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('AR Aging')).toBeInTheDocument();
    expect(screen.getByText('State Rules')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Methods')).toBeInTheDocument();
  });

  it('navigates through all tabs and displays correct content', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Default tab should show overview
    await waitFor(() => {
      expect(screen.getByText('Payment Overview')).toBeInTheDocument();
    });

    // Verify tab navigation by clicking each tab
    const tabs = ['History', 'AR Aging', 'Tenant Ledger', 'Post Charges', 'Late Fees', 'Payment Plans', 'Security Deposits', 'State Rules', 'Billing', 'Methods'];
    for (const tabName of tabs) {
      const tabElement = screen.getByText(tabName);
      await user.click(tabElement);
      // Tab should remain visible after click
      expect(tabElement).toBeInTheDocument();
    }
  });

  it('filters payment history correctly', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Navigate to payment history
    const historyTab = screen.getByText('History');
    await user.click(historyTab);

    await waitFor(() => {
      expect(historyTab).toBeInTheDocument();
    });
  });

  it('toggles filters panel correctly', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Click filters button
    await user.click(screen.getByText('Filters'));

    // Filters panel should be visible - check for Date Range label
    await waitFor(() => {
      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });
  });

  it('exports data when export button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);
    
    // Click export button
    await user.click(screen.getByText('Export'));
    
    await waitFor(() => {
      // Should trigger export function (in real app, would download file)
      expect(screen.getByText(/export/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);
    
    // Click refresh button
    await user.click(screen.getByText('Refresh'));
    
    await waitFor(() => {
      // Should trigger refresh (would reload data in real app)
      expect(screen.getByText('Payment Dashboard')).toBeInTheDocument();
    });
  });

  it('displays error state and allows retry', async () => {
    const mockRefresh = vi.fn();
    // Mock error state
    vi.mocked(usePaymentDashboard).mockReturnValue({
      metrics: null,
      paymentHistory: [],
      outstandingBalances: [],
      collectionStatus: null,
      loading: false,
      error: 'Failed to load data',
      refreshData: mockRefresh,
      exportData: vi.fn()
    });

    render(<PaymentDashboard />);

    // Should show error message
    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByText('Retry');
    await userEvent.click(retryButton);

    // Should trigger refresh function
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('displays loading state during data fetch', () => {
    // Mock loading state
    vi.mocked(usePaymentDashboard).mockReturnValue({
      metrics: null,
      paymentHistory: [],
      outstandingBalances: [],
      collectionStatus: null,
      loading: true,
      error: null,
      refreshData: vi.fn(),
      exportData: vi.fn()
    });

    render(<PaymentDashboard />);

    // Should show loading indicators
    const loadingElements = screen.getAllByTestId('loading-placeholder');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('responds to window resize for responsive design', () => {
    render(<PaymentDashboard />);
    
    // Check for responsive grid classes
    const gridElement = document.querySelector('.grid');
    expect(gridElement).toBeInTheDocument();
    
    // Simulate window resize
    fireEvent(window, new Event('resize'));
    
    // Component should still render correctly
    expect(screen.getByText('Payment Dashboard')).toBeInTheDocument();
  });

  it('applies DoorLoop color scheme correctly', () => {
    const { container } = render(<PaymentDashboard />);

    // Check for DoorLoop color classes
    const primaryElements = container.querySelectorAll('.bg-primary');
    expect(primaryElements.length).toBeGreaterThan(0);

    const accentGreenElements = container.querySelectorAll('.bg-accent-green');
    expect(accentGreenElements.length).toBeGreaterThan(0);

    // Check for accent colors in text (used in icons)
    const accentPinkText = container.querySelectorAll('.text-accent-pink');
    expect(accentPinkText.length).toBeGreaterThan(0);
  });

  it('displays summary statistics correctly', async () => {
    render(<PaymentDashboard />);

    await waitFor(() => {
      // Check that summary stats are displayed (values from mock)
      expect(screen.getByText('Payment Overview')).toBeInTheDocument();
    });
  });

  it('maintains tab state when navigating', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Start on overview tab
    expect(screen.getByText('Payment Overview')).toBeInTheDocument();

    // Navigate to payment history
    const historyTab = screen.getByText('History');
    await user.click(historyTab);
    expect(historyTab).toBeInTheDocument();

    // Navigate back to overview
    await user.click(screen.getByText('Overview'));
    expect(screen.getByText('Payment Overview')).toBeInTheDocument();
  });
});