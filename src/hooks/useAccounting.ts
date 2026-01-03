/**
 * Accounting Hooks - Double-Entry Bookkeeping Operations
 * Zero-tolerance for accounting errors
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountingService } from '../services/accountingService';

export const accountingKeys = {
  all: ['accounting'] as const,
  tenantBalance: (tenantId: string) => [...accountingKeys.all, 'tenant-balance', tenantId] as const,
  tenantLedger: (tenantId: string) => [...accountingKeys.all, 'tenant-ledger', tenantId] as const,
};

interface LateFeeInput {
  tenantId: string;
  tenantName: string;
  leaseId?: string;
  propertyId?: string;
  unitId?: string;
  amount: number;
  daysLate: number;
  state: 'NC' | 'SC' | 'GA';
  feeCalculation: string;
  dueDate: string;
}

/**
 * Post a late fee with proper double-entry accounting
 * Debit: Accounts Receivable
 * Credit: Late Fee Income
 */
export function usePostLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LateFeeInput) => AccountingService.postLateFee(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: accountingKeys.all });
        queryClient.invalidateQueries({
          queryKey: accountingKeys.tenantBalance(variables.tenantId),
        });
        queryClient.invalidateQueries({
          queryKey: accountingKeys.tenantLedger(variables.tenantId),
        });
        // Also invalidate payment queries as they may display tenant balances
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      }
    },
  });
}

/**
 * Get tenant's current outstanding balance
 */
export function useTenantBalance(tenantId: string) {
  return useQuery({
    queryKey: accountingKeys.tenantBalance(tenantId),
    queryFn: () => AccountingService.getTenantBalance(tenantId),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get tenant's ledger entries
 */
export function useTenantLedger(tenantId: string, limit = 50) {
  return useQuery({
    queryKey: accountingKeys.tenantLedger(tenantId),
    queryFn: () => AccountingService.getTenantLedger(tenantId, limit),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
