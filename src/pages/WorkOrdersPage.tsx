// Work Orders Page
import React, { useState } from 'react';
import { WorkOrdersList } from '../features/work-orders/WorkOrdersList';
import { CreateWorkOrderModal } from '../features/work-orders/CreateWorkOrderModal';
import type { WorkOrder } from '../types';

export default function WorkOrdersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  return (
    <div className="p-8">
      <WorkOrdersList
        onCreateClick={() => setIsCreateModalOpen(true)}
        onEditClick={(workOrder) => {
          setSelectedWorkOrder(workOrder);
          // TODO: Open edit modal
        }}
      />

      <CreateWorkOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
