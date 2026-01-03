// Tenants List Component
import React from 'react';
import { useTenants, useDeleteTenant } from '../../hooks/useTenants';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Loading } from '../../components/ui/Loading';
import { Plus, Trash2, Edit, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import type { Tenant } from '../../types';

interface TenantsListProps {
  onCreateClick: () => void;
  onEditClick: (tenant: Tenant) => void;
}

export function TenantsList({ onCreateClick, onEditClick }: TenantsListProps) {
  const { data: tenants, isLoading, error } = useTenants();
  const deleteTenant = useDeleteTenant();

  const getStatusBadgeVariant = (status: Tenant['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'default';
      case 'evicted':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      await deleteTenant.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <Loading text="Loading tenants..." />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-status-error">Error loading tenants: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-black">Tenants</h2>
          <p className="text-sm text-neutral-medium mt-1">
            Manage your tenants and lease information
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onCreateClick}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select className="px-4 py-2 border border-neutral-light rounded-md text-sm">
          <option>All Statuses</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Inactive</option>
        </select>
        <input
          type="search"
          placeholder="Search tenants..."
          className="px-4 py-2 border border-neutral-light rounded-md text-sm flex-1 max-w-md"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-light">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Move-in Date</TableHead>
              <TableHead>Active Leases</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants && tenants.length > 0 ? (
              tenants.map((tenant) => (
                <TableRow key={tenant.id} hoverable>
                  <TableCell className="font-medium">
                    {tenant.first_name} {tenant.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-neutral-medium" />
                        <span>{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-neutral-medium" />
                        <span>{tenant.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.move_in_date
                      ? format(new Date(tenant.move_in_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{tenant.leases?.length || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditClick(tenant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(tenant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-status-error" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-neutral-medium">
                  No tenants found. Add your first tenant to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
