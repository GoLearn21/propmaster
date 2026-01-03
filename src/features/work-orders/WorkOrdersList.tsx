// Work Orders List Component
import React, { useState } from 'react';
import { useWorkOrders, useDeleteWorkOrder, useUpdateWorkOrderStatus } from '../../hooks/useWorkOrders';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Loading } from '../../components/ui/Loading';
import { Plus, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { WorkOrder } from '../../types';

interface WorkOrdersListProps {
  onCreateClick: () => void;
  onEditClick: (workOrder: WorkOrder) => void;
}

export function WorkOrdersList({ onCreateClick, onEditClick }: WorkOrdersListProps) {
  const { data: workOrders, isLoading, error } = useWorkOrders();
  const deleteWorkOrder = useDeleteWorkOrder();
  const updateStatus = useUpdateWorkOrderStatus();

  const getStatusBadgeVariant = (status: WorkOrder['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'new':
        return 'warning';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: WorkOrder['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this work order?')) {
      await deleteWorkOrder.mutateAsync(id);
    }
  };

  const handleStatusChange = async (id: string, status: WorkOrder['status']) => {
    await updateStatus.mutateAsync({ id, status });
  };

  if (isLoading) {
    return <Loading text="Loading work orders..." />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-status-error">Error loading work orders: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-black">Work Orders</h2>
          <p className="text-sm text-neutral-medium mt-1">
            Manage maintenance requests and work orders
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onCreateClick}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          New Work Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select className="px-4 py-2 border border-neutral-light rounded-md text-sm">
          <option>All Statuses</option>
          <option>New</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select className="px-4 py-2 border border-neutral-light rounded-md text-sm">
          <option>All Priorities</option>
          <option>Urgent</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-light">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders && workOrders.length > 0 ? (
              workOrders.map((workOrder) => (
                <TableRow key={workOrder.id} hoverable>
                  <TableCell className="font-medium">{workOrder.title}</TableCell>
                  <TableCell>{workOrder.property?.name || 'N/A'}</TableCell>
                  <TableCell>{workOrder.category}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(workOrder.priority)}>
                      {workOrder.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(workOrder.status)}>
                      {workOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(workOrder.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditClick(workOrder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(workOrder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-status-error" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-neutral-medium">
                  No work orders found. Create your first work order to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
