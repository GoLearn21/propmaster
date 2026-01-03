// Create Tenant Modal
import React from 'react';
import { useForm } from 'react-hook-form';
import { useCreateTenant } from '../../hooks/useTenants';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import type { CreateTenantInput } from '../../types';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTenantModal({ isOpen, onClose }: CreateTenantModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateTenantInput>();
  const createTenant = useCreateTenant();

  const onSubmit = async (data: CreateTenantInput) => {
    try {
      await createTenant.mutateAsync(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold text-neutral-black mb-6">
          Add New Tenant
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              {...register('first_name', { required: 'First name is required' })}
              error={errors.first_name?.message}
              placeholder="John"
            />

            <Input
              label="Last Name"
              {...register('last_name', { required: 'Last name is required' })}
              error={errors.last_name?.message}
              placeholder="Doe"
            />
          </div>

          <Input
            label="Email"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            error={errors.email?.message}
            placeholder="john.doe@example.com"
          />

          <Input
            label="Phone"
            type="tel"
            {...register('phone', { required: 'Phone is required' })}
            error={errors.phone?.message}
            placeholder="(555) 123-4567"
          />

          <Input
            label="Move-in Date (Optional)"
            type="date"
            {...register('move_in_date')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name (Optional)"
              {...register('emergency_contact_name')}
              placeholder="Jane Doe"
            />

            <Input
              label="Emergency Contact Phone (Optional)"
              type="tel"
              {...register('emergency_contact_phone')}
              placeholder="(555) 987-6543"
            />
          </div>

          <Textarea
            label="Notes (Optional)"
            {...register('notes')}
            placeholder="Add any additional notes about this tenant..."
            rows={3}
          />

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
              loading={createTenant.isPending}
            >
              Add Tenant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
