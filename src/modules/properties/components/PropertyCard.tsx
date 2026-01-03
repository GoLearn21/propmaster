import React from 'react';
import { 
  Building, 
  Home,
  Building2,
  Store,
  Factory,
  Car,
  MapPin,
  Users,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Copy,
  Eye
} from 'lucide-react';

interface Property {
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

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onViewUnits?: () => void;
}

// Property type definitions with icons and colors
const PROPERTY_TYPE_CONFIG = {
  // Residential types
  'single-family': { label: 'Single-Family', icon: Home, color: 'bg-blue-500' },
  'multi-family': { label: 'Multi-Family', icon: Building2, color: 'bg-blue-600' },
  'condo': { label: 'Condo', icon: Building, color: 'bg-blue-400' },
  'townhome': { label: 'Townhome', icon: Building2, color: 'bg-blue-700' },
  
  // Commercial types  
  'office': { label: 'Office', icon: Building, color: 'bg-purple-500' },
  'retail': { label: 'Retail', icon: Store, color: 'bg-purple-600' },
  'shopping-center': { label: 'Shopping Center', icon: Store, color: 'bg-purple-700' },
  'storage': { label: 'Storage', icon: Building, color: 'bg-gray-500' },
  'parking': { label: 'Parking', icon: Car, color: 'bg-gray-600' },
  'industrial': { label: 'Industrial', icon: Factory, color: 'bg-gray-700' },
  
  // Default
  'other': { label: 'Other', icon: Building, color: 'bg-gray-800' }
};

const getPropertyTypeConfig = (propertyType: string | undefined) => {
  if (!propertyType) return PROPERTY_TYPE_CONFIG['other'];
  const normalizedType = propertyType.toLowerCase().replace(/[_\s-]+/g, '-');
  return PROPERTY_TYPE_CONFIG[normalizedType] || PROPERTY_TYPE_CONFIG['other'];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onClick,
  onEdit,
  onDelete,
  onArchive,
  onDuplicate,
  onViewUnits
}) => {
  const typeConfig = getPropertyTypeConfig(property.property_type);
  const IconComponent = typeConfig.icon;
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      {/* Property Image/Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg relative overflow-hidden">
        {property.image_url ? (
          <img 
            src={property.image_url} 
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <IconComponent className="w-16 h-16 text-gray-400 group-hover:text-gray-500 transition-colors" />
          </div>
        )}
        
        {/* Property Type Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm ${typeConfig.color}`}>
            <IconComponent className="w-3 h-3" />
            {typeConfig.label}
          </span>
        </div>

        {/* Status Badge */}
        {property.status && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}>
              {property.status}
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Property Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-teal-600 transition-colors">
          {property.name}
        </h3>
        
        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
          <span className="line-clamp-2">
            {property.address}, {property.city}, {property.state} {property.zip_code}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Location</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {property.city}
            </div>
            <div className="text-xs text-gray-500">
              {property.state}
            </div>
          </div>

          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Added</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {new Date(property.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(property.created_at).getFullYear()}
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            ID: {property.id.slice(-8)}
          </div>
          
          <div className="relative">
            <button 
              onClick={handleMenuClick}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </button>
            
            {showMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => handleMenuAction(() => onViewUnits?.(), e)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Units
                  </button>
                  <button
                    onClick={(e) => handleMenuAction(() => onEdit?.(), e)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Property
                  </button>
                  <button
                    onClick={(e) => handleMenuAction(() => onDuplicate?.(), e)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => handleMenuAction(() => onArchive?.(), e)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={(e) => handleMenuAction(() => onDelete?.(), e)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
