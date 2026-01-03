import { useState, useEffect, useMemo } from 'react';

// Property type definitions
export const PROPERTY_TYPES = {
  residential: {
    label: 'Residential',
    subtypes: {
      'single-family': 'Single-Family',
      'multi-family': 'Multi-Family', 
      'condo': 'Condo',
      'townhome': 'Townhome',
      'other': 'Other Residential'
    }
  },
  commercial: {
    label: 'Commercial',
    subtypes: {
      'office': 'Office',
      'retail': 'Retail',
      'shopping-center': 'Shopping Center',
      'storage': 'Storage',
      'parking': 'Parking',
      'industrial': 'Industrial',
      'other': 'Other Commercial'
    }
  }
};

export const PROPERTY_STATUSES = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Under Maintenance'
} as const;

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  status?: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  image_url?: string;
}

export interface PropertyFilters {
  search: string;
  type: string;
  status: string;
  sortBy: 'name' | 'property_type' | 'city' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

interface UsePropertyFiltersReturn {
  filters: PropertyFilters;
  filteredProperties: Property[];
  availableTypes: string[];
  availableStatuses: string[];
  updateFilter: (key: keyof PropertyFilters, value: string) => void;
  resetFilters: () => void;
  setProperties: (properties: Property[]) => void;
  resultCount: number;
  hasActiveFilters: boolean;
}

const DEFAULT_FILTERS: PropertyFilters = {
  search: '',
  type: '',
  status: '',
  sortBy: 'name',
  sortOrder: 'asc'
};

export const usePropertyFilters = (initialProperties: Property[] = []): UsePropertyFiltersReturn => {
  const [properties, setPropertiesState] = useState<Property[]>(initialProperties);
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);

  // Extract available types and statuses from properties
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    properties.forEach(property => {
      if (property.property_type) {
        types.add(property.property_type);
      }
    });
    return Array.from(types).sort();
  }, [properties]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    properties.forEach(property => {
      if (property.status) {
        statuses.add(property.status);
      }
    });
    return Array.from(statuses).sort();
  }, [properties]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(property => {
        return (
          property.name.toLowerCase().includes(searchTerm) ||
          property.address.toLowerCase().includes(searchTerm) ||
          property.city.toLowerCase().includes(searchTerm) ||
          property.state.toLowerCase().includes(searchTerm) ||
          property.property_type.toLowerCase().includes(searchTerm) ||
          (property.status && property.status.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(property => {
        // Handle both exact matches and partial matching
        return property.property_type === filters.type ||
               property.property_type.toLowerCase().includes(filters.type.toLowerCase());
      });
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(property => property.status === filters.status);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      // Handle different data types
      if (filters.sortBy === 'created_at' || filters.sortBy === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      // Comparison logic
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [properties, filters]);

  // Update filter function
  const updateFilter = (key: keyof PropertyFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset filters function
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Set properties function
  const setProperties = (newProperties: Property[]) => {
    setPropertiesState(newProperties);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(filters.search || filters.type || filters.status);
  }, [filters]);

  return {
    filters,
    filteredProperties,
    availableTypes,
    availableStatuses,
    updateFilter,
    resetFilters,
    setProperties,
    resultCount: filteredProperties.length,
    hasActiveFilters
  };
};

// Helper functions for property type operations
export const getPropertyTypeIcon = (propertyType: string) => {
  const normalizedType = propertyType.toLowerCase().replace(/[_\s-]+/g, '-');
  
  const typeIcons: Record<string, string> = {
    'single-family': 'home',
    'multi-family': 'building-2',
    'condo': 'building',
    'townhome': 'building-2',
    'office': 'building',
    'retail': 'store',
    'shopping-center': 'store',
    'storage': 'building',
    'parking': 'car',
    'industrial': 'factory'
  };

  return typeIcons[normalizedType] || 'building';
};

export const getPropertyTypeColor = (propertyType: string) => {
  const normalizedType = propertyType.toLowerCase().replace(/[_\s-]+/g, '-');
  
  const typeColors: Record<string, string> = {
    'single-family': 'bg-blue-500',
    'multi-family': 'bg-blue-600',
    'condo': 'bg-blue-400',
    'townhome': 'bg-blue-700',
    'office': 'bg-purple-500',
    'retail': 'bg-purple-600',
    'shopping-center': 'bg-purple-700',
    'storage': 'bg-gray-500',
    'parking': 'bg-gray-600',
    'industrial': 'bg-gray-700'
  };

  return typeColors[normalizedType] || 'bg-gray-800';
};

export const getPropertyTypeCategory = (propertyType: string): 'residential' | 'commercial' | 'other' => {
  const normalizedType = propertyType.toLowerCase();
  const residentialTypes = ['single-family', 'multi-family', 'condo', 'townhome'];
  const commercialTypes = ['office', 'retail', 'shopping-center', 'storage', 'parking', 'industrial'];
  
  if (residentialTypes.some(type => normalizedType.includes(type))) {
    return 'residential';
  }
  if (commercialTypes.some(type => normalizedType.includes(type))) {
    return 'commercial';
  }
  return 'other';
};

export const formatPropertyType = (propertyType: string): string => {
  const normalizedType = propertyType.toLowerCase().replace(/[_\s-]+/g, '-');
  
  const formattedTypes: Record<string, string> = {
    'single-family': 'Single-Family',
    'multi-family': 'Multi-Family',
    'shopping-center': 'Shopping Center',
    'other-residential': 'Other Residential',
    'other-commercial': 'Other Commercial'
  };

  return formattedTypes[normalizedType] || 
         propertyType.charAt(0).toUpperCase() + propertyType.slice(1).toLowerCase();
};

export const calculateOccupancyRate = (occupiedUnits: number, totalUnits: number): number => {
  if (totalUnits === 0) return 0;
  return Math.round((occupiedUnits / totalUnits) * 100);
};

export const getOccupancyRateColor = (rate: number): string => {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 75) return 'text-yellow-600';
  if (rate >= 50) return 'text-orange-600';
  return 'text-red-600';
};
