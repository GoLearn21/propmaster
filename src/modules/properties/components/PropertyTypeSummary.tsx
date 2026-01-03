import React from 'react';
import { Home, Building, Store, ShoppingCart, Warehouse, Car, Factory } from 'lucide-react';
import { PropertyTypeOption } from '../types/property';

interface PropertyTypeSummaryProps {
  type: PropertyTypeOption | null;
  showFullDetails?: boolean;
}

const PropertyTypeSummary: React.FC<PropertyTypeSummaryProps> = ({ 
  type, 
  showFullDetails = false 
}) => {
  const getIcon = (iconName: string) => {
    const iconClassName = "w-5 h-5";
    switch (iconName) {
      case 'home':
        return <Home className={iconClassName} />;
      case 'building':
      case 'apartment':
        return <Building className={iconClassName} />;
      case 'store':
        return <Store className={iconClassName} />;
      case 'shopping':
        return <ShoppingCart className={iconClassName} />;
      case 'factory':
        return <Factory className={iconClassName} />;
      case 'warehouse':
        return <Warehouse className={iconClassName} />;
      case 'car':
        return <Car className={iconClassName} />;
      default:
        return <Building className={iconClassName} />;
    }
  };

  if (!type) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-500 text-center">No property type selected</p>
      </div>
    );
  }

  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all duration-200
      ${type.category === 'residential' 
        ? 'bg-blue-50 border-blue-200' 
        : 'bg-green-50 border-green-200'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`
            p-2 rounded-lg
            ${type.category === 'residential' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-green-100 text-green-600'
            }
          `}>
            {getIcon(type.icon)}
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">
              {type.title}
            </h4>
            <p className="text-sm text-gray-600 capitalize mb-2">
              {type.category} Property
            </p>
            
            {showFullDetails && (
              <ul className="text-xs text-gray-500 space-y-1">
                {type.description.map((desc, index) => (
                  <li key={index} className="flex items-start">
                    <span className={`w-1 h-1 rounded-full mr-2 mt-1.5 flex-shrink-0 ${
                      type.category === 'residential' ? 'bg-blue-400' : 'bg-green-400'
                    }`}></span>
                    {desc}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${type.category === 'residential' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
          }
        `}>
          {type.category === 'residential' ? 'Residential' : 'Commercial'}
        </div>
      </div>
    </div>
  );
};

export default PropertyTypeSummary;