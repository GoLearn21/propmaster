// Work Orders hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersService } from '../services/workOrders';
import type { WorkOrder, CreateWorkOrderInput } from '../types';

export function useWorkOrders() {
  return useQuery({
    queryKey: ['workOrders'],
    queryFn: () => workOrdersService.getAll(),
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['workOrders', id],
    queryFn: () => workOrdersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) => workOrdersService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) =>
      workOrdersService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => workOrdersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrder['status'] }) =>
      workOrdersService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });
}

export function useUploadWorkOrderFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workOrderId, file }: { workOrderId: string; file: File }) =>
      workOrdersService.uploadFile(workOrderId, file),
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders', workOrderId] });
    },
  });
}

export function useAddWorkOrderNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workOrderId, note }: { workOrderId: string; note: string }) =>
      workOrdersService.addNote(workOrderId, note),
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders', workOrderId] });
    },
  });
}
