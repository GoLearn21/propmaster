import React, { useState } from 'react';
import { Plus, Settings, BarChart3, Users } from 'lucide-react';
import PropertyList from '../components/property-list/PropertyList';
import { supabase } from '../../../lib/supabase';
import type { Property } from '../hooks/usePropertyFilters';

export default function PropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Load properties from Supabase
  const loadProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load properties on component mount
  React.useEffect(() => {
    loadProperties();
  }, []);

  // Handle property click - navigate to property details
  const handlePropertyClick = (property: Property) => {
    // Navigate to property details page
    window.location.href = `/properties/${property.id}`;
  };

  // Handle property edit
  const handlePropertyEdit = (property: Property) => {
    console.log('Edit property:', property.id);
    // Navigate to property edit page
    window.location.href = `/properties/${property.id}/edit`;
  };

  // Handle property delete
  const handlePropertyDelete = (property: Property) => {
    if (confirm(`Are you sure you want to delete "${property.name}"?`)) {
      console.log('Delete property:', property.id);
      // Implement delete functionality
    }
  };

  // Handle property archive
  const handlePropertyArchive = (property: Property) => {
    console.log('Archive property:', property.id);
    // Implement archive functionality
  };

  // Handle property duplicate
  const handlePropertyDuplicate = (property: Property) => {
    console.log('Duplicate property:', property.id);
    // Navigate to create new property with pre-filled data
    window.location.href = `/properties/new?duplicate=${property.id}`;
  };

  // Handle view units
  const handlePropertyViewUnits = (property: Property) => {
    // Navigate to units page for this property
    window.location.href = `/properties/${property.id}/units`;
  };

  // Handle create new property
  const handleCreateProperty = () => {
    // Navigate to property creation wizard
    window.location.href = '/properties/new';
  };

  // Handle refresh
  const handleRefresh = () => {
    loadProperties();
  };

  // Generate demo properties if none exist
  const generateDemoProperties = (): Property[] => {
    return [
      {
        id: 'demo-1',
        name: 'Sunset Apartments',
        address: '123 Sunset Blvd, Los Angeles, CA 90028',
        type: 'Multi-Family',
        total_units: 24,
        occupied_units: 22,
        status: 'active',
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z',
        image_url: undefined
      },
      {
        id: 'demo-2',
        name: 'Downtown Office Tower',
        address: '456 Business Ave, New York, NY 10001',
        type: 'Office',
        total_units: 15,
        occupied_units: 12,
        status: 'active',
        created_at: '2024-02-10T10:30:00Z',
        updated_at: '2024-02-10T10:30:00Z',
        image_url: undefined
      },
      {
        id: 'demo-3',
        name: 'Elm Street Townhomes',
        address: '789 Elm Street, Chicago, IL 60601',
        type: 'Townhome',
        total_units: 8,
        occupied_units: 8,
        status: 'active',
        created_at: '2024-03-05T14:20:00Z',
        updated_at: '2024-03-05T14:20:00Z',
        image_url: undefined
      },
      {
        id: 'demo-4',
        name: 'Riverside Shopping Center',
        address: '321 River Road, Miami, FL 33101',
        type: 'Shopping Center',
        total_units: 25,
        occupied_units: 20,
        status: 'active',
        created_at: '2024-03-20T09:15:00Z',
        updated_at: '2024-03-20T09:15:00Z',
        image_url: undefined
      },
      {
        id: 'demo-5',
        name: 'Maple Grove Condos',
        address: '654 Maple Drive, Austin, TX 78701',
        type: 'Condo',
        total_units: 36,
        occupied_units: 34,
        status: 'active',
        created_at: '2024-04-02T11:45:00Z',
        updated_at: '2024-04-02T11:45:00Z',
        image_url: undefined
      },
      {
        id: 'demo-6',
        name: 'Industrial Park Complex',
        address: '987 Industrial Way, Seattle, WA 98101',
        type: 'Industrial',
        total_units: 12,
        occupied_units: 10,
        status: 'maintenance',
        created_at: '2024-04-15T16:30:00Z',
        updated_at: '2024-04-15T16:30:00Z',
        image_url: undefined
      },
      {
        id: 'demo-7',
        name: 'Oak Street Retail Plaza',
        address: '147 Oak Street, Denver, CO 80201',
        type: 'Retail',
        total_units: 18,
        occupied_units: 15,
        status: 'active',
        created_at: '2024-05-01T13:00:00Z',
        updated_at: '2024-05-01T13:00:00Z',
        image_url: undefined
      },
      {
        id: 'demo-8',
        name: 'Pine Ridge Single Family Homes',
        address: '258 Pine Ridge Dr, Phoenix, AZ 85001',
        type: 'Single-Family',
        total_units: 6,
        occupied_units: 6,
        status: 'active',
        created_at: '2024-05-20T10:15:00Z',
        updated_at: '2024-05-20T10:15:00Z',
        image_url: undefined
      }
    ];
  };

  // Show demo data when no properties exist (for demonstration purposes)
  const displayProperties = properties.length === 0 && !loading ? generateDemoProperties() : properties;

  return (
    <div>
      <PropertyList
        properties={displayProperties}
        loading={loading}
        onPropertyClick={handlePropertyClick}
        onPropertyEdit={handlePropertyEdit}
        onPropertyDelete={handlePropertyDelete}
        onPropertyArchive={handlePropertyArchive}
        onPropertyDuplicate={handlePropertyDuplicate}
        onPropertyViewUnits={handlePropertyViewUnits}
        onCreateProperty={handleCreateProperty}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
