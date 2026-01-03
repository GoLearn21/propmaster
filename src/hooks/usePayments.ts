import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentService } from '../services/payments';
import type { 
  PaymentDashboardMetrics,
  Payment,
  PaymentMethodDetails,
  PaymentIntent,
  TenantPaymentPortalData,
  CreatePaymentInput,
  ProcessPaymentInput,
  SetupAutopayInput,
} from '../types';

// Query Keys
export const paymentKeys = {
  all: ['payments'] as const,
  dashboardMetrics: (propertyId?: string) => [...paymentKeys.all, 'dashboard-metrics', propertyId] as const,
  recentPayments: (propertyId?: string, limit?: number) => [...paymentKeys.all, 'recent', propertyId, limit] as const,
  paymentHistory: (filters?: any) => [...paymentKeys.all, 'history', filters] as const,
  tenantPortalData: (tenantId: string) => [...paymentKeys.all, 'tenant-portal', tenantId] as const,
  paymentMethods: (tenantId: string) => [...paymentKeys.all, 'payment-methods', tenantId] as const,
};

// Dashboard Hooks
export function usePaymentDashboardMetrics(propertyId?: string) {
  return useQuery({
    queryKey: paymentKeys.dashboardMetrics(propertyId),
    queryFn: () => PaymentService.getPaymentDashboardMetrics(propertyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useRecentPayments(propertyId?: string, limit = 10) {
  return useQuery({
    queryKey: paymentKeys.recentPayments(propertyId, limit),
    queryFn: () => PaymentService.getRecentPayments(propertyId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

export function usePaymentHistory(filters?: {
  tenantId?: string;
  propertyId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: paymentKeys.paymentHistory(filters),
    queryFn: () => PaymentService.getPaymentHistory(filters),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

// Tenant Portal Hooks
export function useTenantPaymentPortalData(tenantId: string) {
  return useQuery({
    queryKey: paymentKeys.tenantPortalData(tenantId),
    queryFn: () => PaymentService.getTenantPaymentPortalData(tenantId),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

export function usePaymentMethods(tenantId: string) {
  return useQuery({
    queryKey: paymentKeys.paymentMethods(tenantId),
    queryFn: () => PaymentService.getPaymentMethods(tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

// Payment Processing Mutations
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      amount: number;
      currency?: string;
      tenantId: string;
      leaseId: string;
      description?: string;
    }) => PaymentService.createPaymentIntent(input),
    onSuccess: (data, variables) => {
      // Invalidate tenant portal data to refresh outstanding balance
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProcessPaymentInput) => PaymentService.confirmPayment(input),
    onSuccess: (data) => {
      // Invalidate multiple queries after successful payment
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      
      // Specifically invalidate tenant portal data if we have tenant info
      if (data.tenant_id) {
        queryClient.invalidateQueries({
          queryKey: paymentKeys.tenantPortalData(data.tenant_id),
        });
      }
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePaymentInput) => PaymentService.recordPayment(input),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(data.tenant_id),
      });
    },
  });
}

// Payment Method Management Mutations
export function useAddPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, stripePaymentMethodId }: {
      tenantId: string;
      stripePaymentMethodId: string;
    }) => PaymentService.addPaymentMethod(tenantId, stripePaymentMethodId),
    onSuccess: (data, variables) => {
      // Invalidate payment methods for this tenant
      queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentMethodId, tenantId }: {
      paymentMethodId: string;
      tenantId: string;
    }) => PaymentService.deletePaymentMethod(paymentMethodId),
    onSuccess: (data, variables) => {
      // Invalidate payment methods for this tenant
      queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, paymentMethodId }: {
      tenantId: string;
      paymentMethodId: string;
    }) => PaymentService.setDefaultPaymentMethod(tenantId, paymentMethodId),
    onSuccess: (data, variables) => {
      // Invalidate payment methods for this tenant
      queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

// Autopay Management Mutations
export function useSetupAutopay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetupAutopayInput) => PaymentService.setupAutopay(input),
    onSuccess: (data, variables) => {
      // Invalidate tenant portal data to reflect autopay changes
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenant_id),
      });
    },
  });
}

export function useCancelAutopay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => PaymentService.cancelAutopay(tenantId),
    onSuccess: (data, tenantId) => {
      // Invalidate tenant portal data to reflect autopay changes
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(tenantId),
      });
    },
  });
}

// Late Fee Management Mutations
export function useApplyLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, amount, daysLate }: {
      tenantId: string;
      amount: number;
      daysLate: number;
    }) => PaymentService.applyLateFee(tenantId, amount, daysLate),
    onSuccess: (data, variables) => {
      // Invalidate payment data to reflect late fee
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

export function useWaiveLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lateFeeId, reason, tenantId }: {
      lateFeeId: string;
      reason: string;
      tenantId: string;
    }) => PaymentService.waiveLateFee(lateFeeId, reason),
    onSuccess: (data, variables) => {
      // Invalidate payment data to reflect waived late fee
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(variables.tenantId),
      });
    },
  });
}

// Utility hook for bulk operations
export function useInvalidatePaymentQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
    invalidateDashboard: (propertyId?: string) => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.dashboardMetrics(propertyId),
      });
    },
    invalidateTenantPortal: (tenantId: string) => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.tenantPortalData(tenantId),
      });
    },
    invalidatePaymentMethods: (tenantId: string) => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(tenantId),
      });
    },
  };
}