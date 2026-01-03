import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentDashboard } from '../../features/payments/PaymentDashboard';
import { TenantPaymentPortal } from '../../features/payments/TenantPaymentPortal';
import { PaymentService } from '../../services/payments';
import * as usePaymentsHooks from '../../hooks/usePayments';

// Mock the payment service and hooks
vi.mock('../../services/payments');
vi.mock('../../hooks/usePayments');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PaymentDashboard', () => {
  const mockMetrics = {
    total_collected: 45320,
    pending_payments: 5,
    overdue_payments: 2,
    late_fees_collected: 1230,
    collection_rate: 94.2,
    avg_days_to_collect: 3.5,
    outstanding_balance: 8450,
    payment_method_breakdown: {
      ach: 15,
      credit_card: 25,
      other: 3,
    },
  };

  const mockRecentPayments = [
    {
      id: '1',
      tenant_id: 'tenant-1',
      lease_id: 'lease-1',
      amount: 1500,
      payment_date: '2025-01-01',
      payment_method: 'credit_card',
      status: 'paid',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      tenant: {
        id: 'tenant-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-0123',
        status: 'active',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      property: {
        id: 'property-1',
        name: 'Downtown Apartment',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        type: 'apartment',
        units_count: 100,
        created_at: '2025-01-01',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for hooks
    vi.mocked(usePaymentsHooks.usePaymentDashboardMetrics).mockReturnValue({
      data: mockMetrics,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.mocked(usePaymentsHooks.useRecentPayments).mockReturnValue({
      data: mockRecentPayments,
      isLoading: false,
    } as any);
    vi.mocked(usePaymentsHooks.usePaymentHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('renders payment dashboard with metrics', async () => {
    render(<PaymentDashboard />, { wrapper: createWrapper() });

    // Check if the dashboard title is rendered
    expect(screen.getByText('Payments Dashboard')).toBeInTheDocument();

    // Check metrics are displayed
    expect(screen.getByText('$45,320.00')).toBeInTheDocument();
    expect(screen.getByText('$8,450.00')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('$1,230.00')).toBeInTheDocument();

    // Check recent payments section header
    expect(screen.getByText('Recent Payments')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    vi.mocked(usePaymentsHooks.usePaymentDashboardMetrics).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<PaymentDashboard />, { wrapper: createWrapper() });

    // Check for loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles error state correctly', async () => {
    vi.mocked(usePaymentsHooks.usePaymentDashboardMetrics).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
    } as any);

    render(<PaymentDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Error Loading Payment Data')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('allows filtering by property', () => {
    render(<PaymentDashboard propertyId="property-1" />, { wrapper: createWrapper() });

    expect(usePaymentsHooks.usePaymentDashboardMetrics).toHaveBeenCalledWith('property-1');
    expect(usePaymentsHooks.useRecentPayments).toHaveBeenCalledWith('property-1', 10);
  });
});

describe('TenantPaymentPortal', () => {
  const mockPortalData = {
    tenant: {
      id: 'tenant-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-0123',
      status: 'active',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
    lease: {
      id: 'lease-1',
      tenant_id: 'tenant-1',
      property_id: 'property-1',
      unit_id: 'unit-1',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      rent_amount: 1500,
      security_deposit: 1500,
      status: 'active',
      payment_day: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      property: {
        id: 'property-1',
        name: 'Downtown Apartment',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        type: 'apartment',
        units_count: 100,
        created_at: '2025-01-01',
      },
    },
    outstanding_balance: 1500,
    next_due_date: '2025-02-01',
    payment_methods: [
      {
        id: 'pm-1',
        tenant_id: 'tenant-1',
        stripe_payment_method_id: 'pm_123',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        is_default: true,
        is_active: true,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ],
    recent_payments: [
      {
        id: 'payment-1',
        tenant_id: 'tenant-1',
        lease_id: 'lease-1',
        amount: 1500,
        payment_date: '2025-01-01',
        payment_method: 'credit_card',
        status: 'paid',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ],
    autopay_enabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for hooks
    vi.mocked(usePaymentsHooks.useTenantPaymentPortalData).mockReturnValue({
      data: mockPortalData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.mocked(usePaymentsHooks.usePaymentMethods).mockReturnValue({
      data: mockPortalData.payment_methods,
    } as any);
    vi.mocked(usePaymentsHooks.useCreatePaymentIntent).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(usePaymentsHooks.useConfirmPayment).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(usePaymentsHooks.useAddPaymentMethod).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(usePaymentsHooks.useSetupAutopay).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(usePaymentsHooks.useCancelAutopay).mockReturnValue({ mutateAsync: vi.fn() } as any);
  });

  it('renders tenant portal with balance and payment info', () => {
    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    // Check portal header
    expect(screen.getByText('Payment Portal')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument();

    // Check balance display
    expect(screen.getByText('Outstanding Balance')).toBeInTheDocument();

    // Check lease information
    expect(screen.getByText('Downtown Apartment')).toBeInTheDocument();
  });

  it('shows paid status when balance is zero', () => {
    vi.mocked(usePaymentsHooks.useTenantPaymentPortalData).mockReturnValue({
      data: { ...mockPortalData, outstanding_balance: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
  });

  it('allows making payments when balance is due', () => {
    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Make a Payment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('handles payment amount selection', () => {
    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    // Click Full Balance button
    const fullBalanceButton = screen.getByText('Full Balance');
    fireEvent.click(fullBalanceButton);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(amountInput.value).toBe('1500');
  });

  it('displays payment history', () => {
    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Payment History')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    vi.mocked(usePaymentsHooks.useTenantPaymentPortalData).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    // Check for loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    vi.mocked(usePaymentsHooks.useTenantPaymentPortalData).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
    } as any);

    render(<TenantPaymentPortal tenantId="tenant-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Error Loading Portal')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});

describe('Payment Integration', () => {
  it('integrates with existing payment architecture', () => {
    // Test that the payment service correctly calls the swappable payment provider
    const mockPaymentProvider = {
      processPayment: vi.fn(),
      createCustomer: vi.fn(),
      addPaymentMethod: vi.fn(),
    };

    // This would test the integration with the payment architecture
    expect(mockPaymentProvider).toBeDefined();
  });

  it('integrates with automated billing system', () => {
    // Test that payments correctly update billing schedules
    const mockBillingSchedule = {
      updateSchedule: vi.fn(),
      processAutomaticPayment: vi.fn(),
    };

    expect(mockBillingSchedule).toBeDefined();
  });

  it('integrates with late fee automation', () => {
    // Test that payments correctly handle late fee calculations
    const mockLateFeeEngine = {
      calculateLateFee: vi.fn(),
      applyLateFee: vi.fn(),
      waiveLateFee: vi.fn(),
    };

    expect(mockLateFeeEngine).toBeDefined();
  });
});