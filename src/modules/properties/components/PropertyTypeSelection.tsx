import React, { useState, useEffect } from 'react';
import { Home, Building, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { PropertyData, PropertyTypeOption } from '../types/property';
import PropertyTypeSummary from './PropertyTypeSummary';

interface PropertyTypeSelectionProps {
  data: PropertyData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<PropertyData>) => void;
}

const RESIDENTIAL_TYPES: PropertyTypeOption[] = [
  {
    id: 'single-family',
    category: 'residential',
    title: 'Single-Family',
    description: [
      'Standalone residential structure designed for one family',
      'Private yard, garage, and dedicated entrance',
      'Complete ownership of land and building',
    ],
    icon: 'home',
  },
  {
    id: 'multi-family',
    category: 'residential',
    title: 'Multi-Family',
    description: [
      'Multiple separate housing units in single building',
      'Designed for rental income from multiple families',
      'Shared building systems and common areas',
    ],
    icon: 'apartment',
  },
  {
    id: 'condo',
    category: 'residential',
    title: 'Condo',
    description: [
      'Individual residential unit in larger building complex',
      'Shared common areas and amenities',
      'Condo association fees and bylaws apply',
    ],
    icon: 'building',
  },
  {
    id: 'townhome',
    category: 'residential',
    title: 'Townhome',
    description: [
      'Multi-floor connected residential units',
      'Private entrance with shared walls',
      'Often includes small private outdoor space',
    ],
    icon: 'home',
  },
  {
    id: 'other-residential',
    category: 'residential',
    title: 'Other',
    description: [
      'Mobile homes and manufactured housing',
      'Tiny homes and alternative housing',
      'Unique residential property types',
    ],
    icon: 'home',
  },
];

const COMMERCIAL_TYPES: PropertyTypeOption[] = [
  {
    id: 'office',
    category: 'commercial',
    title: 'Office',
    description: [
      'Professional office space for business operations',
      'Designed for administrative and professional services',
      'Typically includes parking and conference facilities',
    ],
    icon: 'building',
  },
  {
    id: 'retail',
    category: 'commercial',
    title: 'Retail',
    description: [
      'Storefront space for direct customer sales',
      'High visibility location with customer access',
      'Designed for product display and customer service',
    ],
    icon: 'store',
  },
  {
    id: 'shopping-center',
    category: 'commercial',
    title: 'Shopping Center',
    description: [
      'Multiple retail units in coordinated development',
      'Shared parking, common areas, and infrastructure',
      'Often features anchor tenants and foot traffic',
    ],
    icon: 'shopping',
  },
  {
    id: 'storage',
    category: 'commercial',
    title: 'Storage',
    description: [
      'Self-storage facility with individual rental units',
      'Climate-controlled and standard storage options',
      'Revenue-generating through unit rentals',
    ],
    icon: 'warehouse',
  },
  {
    id: 'parking',
    category: 'commercial',
    title: 'Parking',
    description: [
      'Parking lot or garage for vehicle storage',
      'Revenue-generating through parking fees',
      'Typically located in high-demand urban areas',
    ],
    icon: 'car',
  },
  {
    id: 'industrial',
    category: 'commercial',
    title: 'Industrial',
    description: [
      'Manufacturing, warehouse, or distribution facility',
      'Heavy-duty infrastructure and loading capabilities',
      'Designed for production, storage, or logistics',
    ],
    icon: 'factory',
  },
];

const PropertyTypeSelection: React.FC<PropertyTypeSelectionProps> = ({ data, errors, onUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<'residential' | 'commercial' | null>(
    data.type?.category || null
  );
  const [customTypeValue, setCustomTypeValue] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize category from existing data
  useEffect(() => {
    if (data.type?.category && selectedCategory !== data.type.category) {
      setSelectedCategory(data.type.category);
    }
  }, [data.type, selectedCategory]);

  const handleCategorySelect = (category: 'residential' | 'commercial') => {
    setIsAnimating(true);
    setSelectedCategory(category);
    // Reset type when changing category
    onUpdate({ type: null });
    setCustomTypeValue('');
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePropertyTypeSelect = (propertyType: PropertyTypeOption) => {
    onUpdate({ type: propertyType });
    
    // If "Other" is selected, focus on the custom input
    if (propertyType.id.includes('other')) {
      setTimeout(() => {
        document.getElementById('custom-property-type')?.focus();
      }, 150);
    }
  };

  const handleCustomTypeChange = (value: string) => {
    setCustomTypeValue(value);
    if (data.type?.id.includes('other')) {
      onUpdate({
        type: {
          ...data.type!,
          title: `Other: ${value}`,
        },
      });
    }
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    onUpdate({ type: null });
    setCustomTypeValue('');
  };

  const getIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'home':
        return <Home className={className} />;
      case 'building':
      case 'apartment':
        return <Building className={className} />;
      case 'store':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'shopping':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'factory':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'warehouse':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'car':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        );
      default:
        return <Building className={className} />;
    }
  };

  const currentTypes = selectedCategory === 'residential' ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES;

  return (
    <div className="space-y-8">
      {/* Category Selection */}
      {!selectedCategory && (
        <div className="animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              What type of property are you adding?
            </h2>
            <p className="text-gray-600 text-lg">
              Choose the category that best describes your property
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Residential Card */}
            <button
              onClick={() => handleCategorySelect('residential')}
              className={`
                group relative p-8 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg
                ${selectedCategory === 'residential'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }
              `}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`
                  p-4 rounded-full mb-4 transition-all duration-300
                  ${selectedCategory === 'residential' ? 'bg-blue-100 scale-110' : 'bg-gray-100 group-hover:bg-blue-100 group-hover:scale-105'}
                `}>
                  <Home className={`w-10 h-10 transition-colors duration-300 ${
                    selectedCategory === 'residential' ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Residential</h3>
                <p className="text-gray-600 leading-relaxed">
                  Single-family homes, apartments, condos, and other properties designed for living
                </p>
                <div className="mt-4 flex items-center text-blue-600 font-medium">
                  <span>Select Residential</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              
              {selectedCategory === 'residential' && (
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </button>

            {/* Commercial Card */}
            <button
              onClick={() => handleCategorySelect('commercial')}
              className={`
                group relative p-8 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg
                ${selectedCategory === 'commercial'
                  ? 'border-green-500 bg-green-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                }
              `}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`
                  p-4 rounded-full mb-4 transition-all duration-300
                  ${selectedCategory === 'commercial' ? 'bg-green-100 scale-110' : 'bg-gray-100 group-hover:bg-green-100 group-hover:scale-105'}
                `}>
                  <Building className={`w-10 h-10 transition-colors duration-300 ${
                    selectedCategory === 'commercial' ? 'text-green-600' : 'text-gray-600 group-hover:text-green-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Commercial</h3>
                <p className="text-gray-600 leading-relaxed">
                  Office buildings, retail stores, warehouses, and properties for business use
                </p>
                <div className="mt-4 flex items-center text-green-600 font-medium">
                  <span>Select Commercial</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              
              {selectedCategory === 'commercial' && (
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Specific Property Types */}
      {selectedCategory && (
        <div className={`animate-in fade-in slide-in-from-bottom duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={handleBackToCategories}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Categories
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Select Your {selectedCategory === 'residential' ? 'Residential' : 'Commercial'} Property Type
              </h2>
              <p className="text-gray-600 mt-1">
                Choose the option that best describes your property
              </p>
            </div>
            
            {/* Selected Category Indicator */}
            <div className={`px-4 py-2 rounded-full ${
              selectedCategory === 'residential' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              <span className="font-medium capitalize">{selectedCategory}</span>
            </div>
          </div>

          {/* Property Type Options */}
          <div className="grid gap-4">
            {currentTypes.map((type, index) => (
              <div
                key={type.id}
                className={`
                  group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md
                  ${data.type?.id === type.id
                    ? selectedCategory === 'residential'
                      ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                      : 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                `}
                onClick={() => handlePropertyTypeSelect(type)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start">
                  {/* Radio Button */}
                  <div className="flex-shrink-0 mr-4 pt-1">
                    <input
                      type="radio"
                      name="propertyType"
                      checked={data.type?.id === type.id}
                      onChange={() => handlePropertyTypeSelect(type)}
                      className={`w-5 h-5 ${
                        selectedCategory === 'residential'
                          ? 'text-blue-600 border-blue-300 focus:ring-blue-500'
                          : 'text-green-600 border-green-300 focus:ring-green-500'
                      } border-2 focus:ring-2 focus:ring-opacity-50`}
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-700">
                          {type.title}
                        </h3>
                        <ul className="text-gray-600 space-y-1">
                          {type.description.map((desc, descIndex) => (
                            <li key={descIndex} className="flex items-start">
                              <span className={`w-1.5 h-1.5 rounded-full mr-3 mt-2 flex-shrink-0 ${
                                selectedCategory === 'residential' ? 'bg-blue-400' : 'bg-green-400'
                              }`}></span>
                              <span className="text-sm leading-relaxed">{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Icon */}
                      <div className={`ml-4 p-2 rounded-lg ${
                        data.type?.id === type.id
                          ? selectedCategory === 'residential'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                      } transition-all duration-200`}>
                        {getIcon(type.icon, "w-6 h-6")}
                      </div>
                    </div>

                    {/* Other input field */}
                    {type.id.includes('other') && data.type?.id === type.id && (
                      <div className="mt-4 ml-8">
                        <label htmlFor="custom-property-type" className="block text-sm font-medium text-gray-700 mb-2">
                          Please specify your property type:
                        </label>
                        <input
                          id="custom-property-type"
                          type="text"
                          placeholder="e.g., Mixed-use development, Live-work space..."
                          value={customTypeValue}
                          onChange={(e) => handleCustomTypeChange(e.target.value)}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all ${
                            selectedCategory === 'residential'
                              ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500 focus:bg-blue-50'
                              : 'border-green-300 focus:border-green-500 focus:ring-green-500 focus:bg-green-50'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                {data.type?.id === type.id && (
                  <div className="absolute top-4 right-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center animate-in zoom-in duration-200 ${
                      selectedCategory === 'residential' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {errors.type && (
        <div className="animate-in slide-in-from-top duration-200">
          <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Selection Required</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{errors.type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Current Selection</h4>
          {data.type && (
            <span className="text-sm text-gray-500">
              Step 1 of 5 completed
            </span>
          )}
        </div>
        <PropertyTypeSummary type={data.type} showFullDetails={!!data.type} />
      </div>
    </div>
  );
};

export default PropertyTypeSelection;