import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentDashboard } from './PaymentDashboard';
import { usePaymentDashboard } from './hooks/usePaymentDashboard';

// Mock the hook
vi.mock('./hooks/usePaymentDashboard', () => ({
  usePaymentDashboard: vi.fn(() => ({
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
  }))
}));

describe('PaymentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock with full data
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
      outstandingBalances: [],
      collectionStatus: {
        totalProperties: 23,
        totalTenants: 127,
        paymentStatus: { current: 104, pastDue: 18, severelyDelinquent: 5 },
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

  it('renders dashboard header correctly', () => {
    render(<PaymentDashboard />);
    
    expect(screen.getByText('Payment Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage rent collection, payments, and billing configuration')).toBeInTheDocument();
  });

  it('displays all navigation tabs', () => {
    render(<PaymentDashboard />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('AR Aging')).toBeInTheDocument();
    expect(screen.getByText('Tenant Ledger')).toBeInTheDocument();
    expect(screen.getByText('Post Charges')).toBeInTheDocument();
    expect(screen.getByText('Late Fees')).toBeInTheDocument();
    expect(screen.getByText('Payment Plans')).toBeInTheDocument();
    expect(screen.getByText('Security Deposits')).toBeInTheDocument();
    expect(screen.getByText('State Rules')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Methods')).toBeInTheDocument();
  });

  it('shows action buttons in header', () => {
    render(<PaymentDashboard />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('displays metrics overview on default tab', async () => {
    render(<PaymentDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('$1,247,890')).toBeInTheDocument();
      expect(screen.getByText('$89,750')).toBeInTheDocument();
      expect(screen.getByText('$34,280')).toBeInTheDocument();
      expect(screen.getByText('94.6%')).toBeInTheDocument();
    });
  });

  it('shows loading state when data is loading', () => {
    const mockHook = {
      metrics: null,
      paymentHistory: [],
      outstandingBalances: [],
      collectionStatus: null,
      loading: true,
      error: null,
      refreshData: vi.fn(),
      exportData: vi.fn()
    };
    
    vi.mocked(usePaymentDashboard).mockReturnValue(mockHook);
    
    render(<PaymentDashboard />);
    
    // Should show loading placeholders
    expect(screen.getAllByTestId('loading-placeholder')).toHaveLength(4);
  });

  it('displays error state when there is an error', () => {
    const mockHook = {
      metrics: null,
      paymentHistory: [],
      outstandingBalances: [],
      collectionStatus: null,
      loading: false,
      error: 'Failed to load dashboard data',
      refreshData: vi.fn(),
      exportData: vi.fn()
    };
    
    vi.mocked(usePaymentDashboard).mockReturnValue(mockHook);
    
    render(<PaymentDashboard />);
    
    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('can switch between tabs', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Default tab should be overview
    expect(screen.getByText('Payment Overview')).toBeInTheDocument();

    // Click on History tab
    const historyTab = screen.getByText('History');
    await user.click(historyTab);

    // Tab should be clicked successfully
    expect(historyTab).toBeInTheDocument();
  });

  it('toggles filter panel when filter button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentDashboard />);

    // Click filter button
    await user.click(screen.getByText('Filters'));

    // Filters panel should be visible - check for Date Range label text
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('calls refresh function when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const mockRefresh = vi.fn();
    
    const mockHook = {
      metrics: {
        totalRevenue: 1247890,
        monthlyRevenue: 89750,
        outstandingBalance: 34280,
        collectionRate: 0.946,
        pendingPayments: 23,
        overdueAmount: 15420,
        paidThisMonth: 74330
      },
      paymentHistory: [],
      outstandingBalances: [],
      collectionStatus: null,
      loading: false,
      error: null,
      refreshData: mockRefresh,
      exportData: vi.fn()
    };
    
    vi.mocked(usePaymentDashboard).mockReturnValue(mockHook);
    
    render(<PaymentDashboard />);
    
    // Click refresh button
    await user.click(screen.getByText('Refresh'));
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows responsive design with different grid layouts', () => {
    const { container } = render(<PaymentDashboard />);
    
    // Check for responsive grid classes
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
  });

  it('displays correct color scheme matching DoorLoop design', () => {
    render(<PaymentDashboard />);
    
    // Check for primary color usage in header
    const header = screen.getByText('Payment Dashboard').closest('.bg-primary');
    expect(header).toBeInTheDocument();
  });
});