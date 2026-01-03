// Tenants List tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantsList } from './TenantsList';
import * as tenantsHooks from '../../hooks/useTenants';

// Mock the hooks
vi.mock('../../hooks/useTenants');

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

describe('TenantsList', () => {
  const mockOnCreateClick = vi.fn();
  const mockOnEditClick = vi.fn();

  it('should render loading state', () => {
    vi.spyOn(tenantsHooks, 'useTenants').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    
    vi.spyOn(tenantsHooks, 'useDeleteTenant').mockReturnValue({} as any);

    render(
      <TenantsList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/loading tenants/i)).toBeInTheDocument();
  });

  it('should render tenants table', async () => {
    const mockTenants = [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        status: 'active',
        move_in_date: new Date().toISOString(),
        leases: [],
      },
    ];

    vi.spyOn(tenantsHooks, 'useTenants').mockReturnValue({
      data: mockTenants,
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(tenantsHooks, 'useDeleteTenant').mockReturnValue({} as any);

    render(
      <TenantsList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('555-1234')).toBeInTheDocument();
    });
  });

  it('should render empty state when no tenants', async () => {
    vi.spyOn(tenantsHooks, 'useTenants').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(tenantsHooks, 'useDeleteTenant').mockReturnValue({} as any);

    render(
      <TenantsList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no tenants found/i)).toBeInTheDocument();
    });
  });

  it('should call onCreateClick when add tenant button is clicked', async () => {
    vi.spyOn(tenantsHooks, 'useTenants').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    
    vi.spyOn(tenantsHooks, 'useDeleteTenant').mockReturnValue({} as any);

    render(
      <TenantsList
        onCreateClick={mockOnCreateClick}
        onEditClick={mockOnEditClick}
      />,
      { wrapper: createWrapper() }
    );

    const addButton = screen.getByRole('button', { name: /add tenant/i });
    addButton.click();

    expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
  });
});
