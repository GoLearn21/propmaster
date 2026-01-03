// Create Work Order Modal
import React from 'react';
import { useForm } from 'react-hook-form';
import { useCreateWorkOrder } from '../../hooks/useWorkOrders';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import type { CreateWorkOrderInput } from '../../types';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkOrderModal({ isOpen, onClose }: CreateWorkOrderModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateWorkOrderInput>();
  const createWorkOrder = useCreateWorkOrder();

  const onSubmit = async (data: CreateWorkOrderInput) => {
    try {
      await createWorkOrder.mutateAsync(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to create work order:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold text-neutral-black mb-6">
          Create New Work Order
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            placeholder="e.g., Fix leaking faucet"
          />

          <Textarea
            label="Description"
            {...register('description', { required: 'Description is required' })}
            error={errors.description?.message}
            placeholder="Describe the issue in detail..."
            rows={4}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              {...register('priority', { required: 'Priority is required' })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              error={errors.priority?.message}
            />

            <Input
              label="Category"
              {...register('category', { required: 'Category is required' })}
              error={errors.category?.message}
              placeholder="e.g., Plumbing, Electrical"
            />
          </div>

          <Input
            label="Property ID"
            {...register('property_id', { required: 'Property is required' })}
            error={errors.property_id?.message}
            placeholder="Enter property ID"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit ID (Optional)"
              {...register('unit_id')}
              placeholder="Enter unit ID"
            />

            <Input
              label="Tenant ID (Optional)"
              {...register('tenant_id')}
              placeholder="Enter tenant ID"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Cost (Optional)"
              type="number"
              {...register('estimated_cost', { valueAsNumber: true })}
              placeholder="0.00"
            />

            <Input
              label="Scheduled Date (Optional)"
              type="date"
              {...register('scheduled_date')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createWorkOrder.isPending}
            >
              Create Work Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
