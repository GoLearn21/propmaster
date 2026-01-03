import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Grid3X3, 
  List,
  ChevronDown,
  X,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react';
import PropertyCard from '../PropertyCard';
import { usePropertyFilters, PROPERTY_TYPES, PROPERTY_STATUSES } from '../../hooks/usePropertyFilters';
import type { Property } from '../../hooks/usePropertyFilters';

interface PropertyListProps {
  properties: Property[];
  loading?: boolean;
  onPropertyClick?: (property: Property) => void;
  onPropertyEdit?: (property: Property) => void;
  onPropertyDelete?: (property: Property) => void;
  onPropertyArchive?: (property: Property) => void;
  onPropertyDuplicate?: (property: Property) => void;
  onPropertyViewUnits?: (property: Property) => void;
  onCreateProperty?: () => void;
  onRefresh?: () => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  loading = false,
  onPropertyClick,
  onPropertyEdit,
  onPropertyDelete,
  onPropertyArchive,
  onPropertyDuplicate,
  onPropertyViewUnits,
  onCreateProperty,
  onRefresh,
  className = ''
}) => {
  const {
    filters,
    filteredProperties,
    availableTypes,
    availableStatuses,
    updateFilter,
    resetFilters,
    setProperties,
    resultCount,
    hasActiveFilters
  } = usePropertyFilters(properties);

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Update properties when props change
  React.useEffect(() => {
    setProperties(properties);
  }, [properties, setProperties]);

  const handlePropertyClick = (property: Property) => {
    onPropertyClick?.(property);
  };

  const handlePropertyEdit = (property: Property) => {
    onPropertyEdit?.(property);
  };

  const handlePropertyDelete = (property: Property) => {
    onPropertyDelete?.(property);
  };

  const handlePropertyArchive = (property: Property) => {
    onPropertyArchive?.(property);
  };

  const handlePropertyDuplicate = (property: Property) => {
    onPropertyDuplicate?.(property);
  };

  const handlePropertyViewUnits = (property: Property) => {
    onPropertyViewUnits?.(property);
  };

  const SortIcon = filters.sortOrder === 'asc' ? SortAsc : SortDesc;

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your property portfolio
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
            {onCreateProperty && (
              <button 
                onClick={onCreateProperty}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Property
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties by name, address, or type..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              hasActiveFilters || showFilters
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-teal-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                {[filters.search, filters.type, filters.status].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Property Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>
                      {PROPERTY_STATUSES[status as keyof typeof PROPERTY_STATUSES] || status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="name">Name</option>
                  <option value="property_type">Type</option>
                  <option value="city">City</option>
                  <option value="created_at">Date Added</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  <SortIcon className="w-4 h-4" />
                  {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="px-8 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {resultCount} of {properties.length} properties
            {hasActiveFilters && (
              <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                Filtered
              </span>
            )}
          </p>
          {resultCount > 0 && (
            <div className="text-xs text-gray-500">
              Sorted by {filters.sortBy} ({filters.sortOrder})
            </div>
          )}
        </div>
      </div>

      {/* Properties Display */}
      <div className="p-8">
        {resultCount === 0 ? (
          <div className="text-center py-12">
            {properties.length === 0 ? (
              <>
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
                <p className="text-gray-600 mb-4">
                  Get started by adding your first property to the portfolio.
                </p>
                {onCreateProperty && (
                  <button 
                    onClick={onCreateProperty}
                    className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Property
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No properties match your filters</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or clearing the filters to see more results.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => handlePropertyClick(property)}
                onEdit={() => handlePropertyEdit(property)}
                onDelete={() => handlePropertyDelete(property)}
                onArchive={() => handlePropertyArchive(property)}
                onDuplicate={() => handlePropertyDuplicate(property)}
                onViewUnits={() => handlePropertyViewUnits(property)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyList;
