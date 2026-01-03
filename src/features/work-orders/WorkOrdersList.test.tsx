// Work Orders List tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkOrdersList } from './WorkOrdersList';
import * as workOrdersHooks from '../../hooks/useWorkOrders';

// Mock the hooks
vi.mock('../../hooks/useWorkOrders');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('WorkOrdersList', () => {
  const mockOnCreateClick = vi.fn();
  const mockOnEditClick = vi.fn();

  it('should render loading state', () => {
    vi.spyOn(workOrdersHooks, 'useWorkOrders').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    
    vi.spyOn(workOrdersHooks, 'useDeleteWorkOrder').mockReturnValue({} as any);
    vi.spyOn(workOrdersHooks, 'useUpdateWorkOrderStatus').mockReturnValue({} as any);

    render(
      <WorkOrdersList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/loading work orders/i)).toBeInTheDocument();
  });

  it('should render work orders table', async () => {
    const mockWorkOrders = [
      {
        id: '1',
        title: 'Fix leaking faucet',
        category: 'Plumbing',
        priority: 'high',
        status: 'new',
        created_at: new Date().toISOString(),
        property: { name: 'Test Property' },
      },
    ];

    vi.spyOn(workOrdersHooks, 'useWorkOrders').mockReturnValue({
      data: mockWorkOrders,
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(workOrdersHooks, 'useDeleteWorkOrder').mockReturnValue({} as any);
    vi.spyOn(workOrdersHooks, 'useUpdateWorkOrderStatus').mockReturnValue({} as any);

    render(
      <WorkOrdersList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Fix leaking faucet')).toBeInTheDocument();
      expect(screen.getByText('Plumbing')).toBeInTheDocument();
      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });
  });

  it('should render empty state when no work orders', async () => {
    vi.spyOn(workOrdersHooks, 'useWorkOrders').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(workOrdersHooks, 'useDeleteWorkOrder').mockReturnValue({} as any);
    vi.spyOn(workOrdersHooks, 'useUpdateWorkOrderStatus').mockReturnValue({} as any);

    render(
      <WorkOrdersList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no work orders found/i)).toBeInTheDocument();
    });
  });

  it('should call onCreateClick when new work order button is clicked', async () => {
    vi.spyOn(workOrdersHooks, 'useWorkOrders').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(workOrdersHooks, 'useDeleteWorkOrder').mockReturnValue({} as any);
    vi.spyOn(workOrdersHooks, 'useUpdateWorkOrderStatus').mockReturnValue({} as any);

    render(
      <WorkOrdersList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    const newButton = screen.getByRole('button', { name: /new work order/i });
    newButton.click();

    expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
  });
});
