# Property Types Categorization System

## Overview

This document outlines the property types categorization system implemented in the PropMaster Properties List View. The system provides comprehensive property type management with visual indicators, filtering, and categorization features.

## Property Type Categories

### Residential Properties
Residential properties are designed for living purposes and are categorized as follows:

#### Single-Family
- **Description**: Standalone residential structure, Intended for one family
- **Icon**: Home
- **Color**: Blue (bg-blue-500)
- **Use Case**: Individual houses, detached homes

#### Multi-Family
- **Description**: Multiple residential units, Shared building structure
- **Icon**: Building2
- **Color**: Blue (bg-blue-600)
- **Use Case**: Apartment buildings, duplexes, triplexes

#### Condo
- **Description**: Individual ownership, Shared community amenities
- **Icon**: Building
- **Color**: Blue (bg-blue-400)
- **Use Case**: Condominiums, individual condo units

#### Townhome
- **Description**: Attached residential units, Individual lots
- **Icon**: Building2
- **Color**: Blue (bg-blue-700)
- **Use Case**: Townhouses, row houses, attached homes

#### Other (Residential)
- **Description**: Custom residential property type
- **Icon**: Home
- **Color**: Blue (bg-blue-800)
- **Use Case**: Other residential classifications not covered above

### Commercial Properties
Commercial properties are designed for business use and are categorized as follows:

#### Office
- **Description**: Commercial office space, Business use
- **Icon**: Building
- **Color**: Purple (bg-purple-500)
- **Use Case**: Office buildings, business centers, professional spaces

#### Retail
- **Description**: Retail storefront, Customer-facing business
- **Icon**: Store
- **Color**: Purple (bg-purple-600)
- **Use Case**: Retail stores, shops, boutiques

#### Shopping Center
- **Description**: Multiple retail spaces, Shared commercial complex
- **Icon**: Store
- **Color**: Purple (bg-purple-700)
- **Use Case**: Malls, shopping plazas, retail complexes

#### Storage
- **Description**: Self-storage facility, Storage units
- **Icon**: Building
- **Color**: Gray (bg-gray-500)
- **Use Case**: Self-storage units, warehouses, storage facilities

#### Parking
- **Description**: Parking structure/lots, Vehicle parking
- **Icon**: Car
- **Color**: Gray (bg-gray-600)
- **Use Case**: Parking lots, parking garages, parking structures

#### Industrial
- **Description**: Manufacturing/warehouse, Industrial use
- **Icon**: Factory
- **Color**: Gray (bg-gray-700)
- **Use Case**: Manufacturing facilities, warehouses, industrial plants

#### Other (Commercial)
- **Description**: Custom commercial property type
- **Icon**: Building
- **Color**: Gray (bg-gray-800)
- **Use Case**: Other commercial classifications not covered above

## Implementation Components

### 1. PropertyCard Component
Located at: `/src/modules/properties/components/PropertyCard.tsx`

**Features:**
- Visual property type badges with icons
- Status indicators (Active, Inactive, Under Maintenance)
- Occupancy rate display with progress bar
- Action menu with edit, delete, archive, duplicate options
- Responsive design for mobile and desktop
- Hover effects and smooth transitions

**Key Features:**
- Property type categorization with color coding
- Occupancy statistics display
- Property image placeholder with type icon
- Status badges with color coding
- Action menu with property management options

### 2. PropertyList Component
Located at: `/src/modules/properties/components/property-list/PropertyList.tsx`

**Features:**
- Advanced filtering by property type and status
- Search functionality across property name, address, and type
- Sortable columns (name, type, units, date)
- Grid and list view modes
- Real-time filter application
- Empty state handling
- Results count display

**Key Features:**
- Comprehensive search and filtering system
- View mode switching (grid/list)
- Clear filters functionality
- Sort options with visual indicators
- Loading states and error handling

### 3. usePropertyFilters Hook
Located at: `/src/modules/properties/hooks/usePropertyFilters.ts`

**Features:**
- Centralized filtering state management
- Search functionality across multiple fields
- Type and status filtering
- Sort functionality
- Helper functions for type categorization
- Utility functions for occupancy calculations

**Key Functions:**
- `updateFilter()` - Update specific filter
- `resetFilters()` - Clear all filters
- `setProperties()` - Update properties list
- `getPropertyTypeCategory()` - Determine if residential/commercial
- `calculateOccupancyRate()` - Calculate occupancy percentage
- `getOccupancyRateColor()` - Color coding for occupancy rates

### 4. PropertiesListPage Component
Located at: `/src/modules/properties/pages/PropertiesListPage.tsx`

**Features:**
- Main page component integrating all functionality
- Supabase integration for property data
- Demo data generation for testing
- Navigation handlers for property actions
- Responsive layout

## Visual Design Elements

### Color Scheme
- **Residential Properties**: Blue color family
  - Single-Family: bg-blue-500
  - Multi-Family: bg-blue-600
  - Condo: bg-blue-400
  - Townhome: bg-blue-700
  - Other: bg-blue-800

- **Commercial Properties**: Purple and Gray color families
  - Office: bg-purple-500
  - Retail: bg-purple-600
  - Shopping Center: bg-purple-700
  - Storage: bg-gray-500
  - Parking: bg-gray-600
  - Industrial: bg-gray-700
  - Other: bg-gray-800

### Status Indicators
- **Active**: Green background (bg-green-100, text-green-800)
- **Inactive**: Gray background (bg-gray-100, text-gray-800)
- **Under Maintenance**: Yellow background (bg-yellow-100, text-yellow-800)

### Icon System
Icons are imported from Lucide React and include:
- Home (for residential types)
- Building (for single properties)
- Building2 (for multi-unit properties)
- Store (for retail properties)
- Factory (for industrial properties)
- Car (for parking properties)

## Filtering and Search

### Search Functionality
- Searches across property name, address, type, and status
- Case-insensitive matching
- Real-time filtering as user types
- Search term preservation in input field

### Filter Options
1. **Property Type Filter**
   - Dropdown with all available property types
   - Dynamic options based on actual property data
   - Grouped by residential/commercial categories

2. **Status Filter**
   - Active, Inactive, Under Maintenance
   - Based on property.status field

3. **Sort Options**
   - Name (alphabetical)
   - Type (alphabetical)
   - Total Units (numerical)
   - Occupied Units (numerical)
   - Date Added (chronological)
   - Ascending/Descending order

### Active Filter Indicators
- Filter count badge on filter button
- Visual feedback for active filters
- Clear filters functionality
- Filter state preservation

## Responsive Design

### Mobile Considerations
- Card layout adapts to single column on mobile
- Touch-friendly buttons and menu interactions
- Simplified filter interface on small screens
- Optimized card content for mobile viewing

### Desktop Features
- Multi-column grid layout
- Detailed filter panel
- Hover effects and transitions
- Full action menu accessibility

## Data Structure

### Property Interface
```typescript
interface Property {
  id: string;
  name: string;
  address: string;
  type: string;           // Property type classification
  subtype?: string;       // Optional subtype
  total_units: number;    // Total units in property
  occupied_units: number; // Currently occupied units
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;     // ISO date string
  updated_at: string;     // ISO date string
  image_url?: string;     // Optional property image
}
```

### Filter State Interface
```typescript
interface PropertyFilters {
  search: string;
  type: string;
  status: string;
  sortBy: 'name' | 'type' | 'units' | 'occupied_units' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
```

## Integration Points

### Supabase Integration
- Properties loaded from 'properties' table
- Real-time updates supported
- Error handling for database operations
- Loading states during data fetch

### Navigation Integration
- Property detail navigation
- Property creation wizard integration
- Unit management navigation
- Property editing workflow

## Usage Examples

### Basic Usage
```tsx
import { PropertyList } from './components/property-list';

function MyPropertiesPage() {
  return (
    <PropertyList
      properties={properties}
      onPropertyClick={handlePropertyClick}
      onCreateProperty={handleCreateProperty}
    />
  );
}
```

### With Custom Handlers
```tsx
<PropertyList
  properties={properties}
  onPropertyClick={(property) => navigate(`/properties/${property.id}`)}
  onPropertyEdit={(property) => openEditModal(property)}
  onPropertyDelete={(property) => confirmAndDelete(property)}
  onCreateProperty={() => navigate('/properties/new')}
  onRefresh={() => refetchProperties()}
/>
```

### Filter Integration
```tsx
const { 
  filters, 
  filteredProperties, 
  updateFilter, 
  resetFilters 
} = usePropertyFilters(properties);

// Access filter state and methods
// Update specific filters
// Reset all filters
```

## Performance Considerations

### Optimization Strategies
- Memoized filtered results
- Efficient re-rendering with React hooks
- Debounced search functionality
- Lazy loading of property images
- Virtual scrolling for large property lists

### Caching
- Filter state preservation
- Property data caching
- Component memoization
- Efficient state updates

## Accessibility Features

### Keyboard Navigation
- Tab order management
- Focus indicators
- Keyboard shortcuts for common actions
- Screen reader compatibility

### Visual Accessibility
- High contrast color combinations
- Clear status indicators
- Descriptive labels and alt text
- Consistent iconography

### User Experience
- Clear visual hierarchy
- Informative empty states
- Loading state feedback
- Error state handling

## Future Enhancements

### Planned Features
1. **Advanced Filtering**
   - Date range filters
   - Occupancy rate filters
   - Custom filter combinations

2. **Bulk Operations**
   - Multi-select for bulk actions
   - Bulk status updates
   - Bulk property management

3. **Enhanced Visualization**
   - Property type distribution charts
   - Occupancy rate trends
   - Geographic mapping integration

4. **Export Functionality**
   - Filtered property reports
   - Export to CSV/Excel
   - Print-friendly layouts

### Integration Opportunities
1. **Maps Integration**
   - Property location visualization
   - Neighborhood analytics
   - Geographic filtering

2. **Analytics Dashboard**
   - Property performance metrics
   - Occupancy trend analysis
   - Revenue reporting

3. **Mobile App**
   - Native mobile interface
   - Offline property viewing
   - Mobile-optimized interactions

## Conclusion

The property types categorization system provides a comprehensive foundation for property management with visual categorization, advanced filtering, and user-friendly interfaces. The modular architecture allows for easy extension and customization while maintaining consistency across the application.
