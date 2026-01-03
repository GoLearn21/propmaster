// Tenants Page
import React, { useState } from 'react';
import { TenantsList } from '../features/tenants/TenantsList';
import { CreateTenantModal } from '../features/tenants/CreateTenantModal';
import type { Tenant } from '../types';

export default function TenantsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  return (
    <div className="p-8">
      <TenantsList
        onCreateClick={() => setIsCreateModalOpen(true)}
        onEditClick={(tenant) => {
          setSelectedTenant(tenant);
          // TODO: Open edit modal
        }}
      />

      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
