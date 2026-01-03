// Tenants hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsService } from '../services/tenants';
import type { Tenant, CreateTenantInput, CreateLeaseInput, Payment } from '../types';

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsService.getAll(),
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenants', id],
    queryFn: () => tenantsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateTenantInput) => tenantsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tenant> }) =>
      tenantsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => tenantsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateLeaseInput) => tenantsService.createLease(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useTenantLeases(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'leases'],
    queryFn: () => tenantsService.getLeases(tenantId),
    enabled: !!tenantId,
  });
}

export function useTenantPayments(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'payments'],
    queryFn: () => tenantsService.getPayments(tenantId),
    enabled: !!tenantId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payment: Omit<Payment, 'id' | 'created_at'>) =>
      tenantsService.recordPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
