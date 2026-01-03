import React from 'react';
import { PropertyTypeSelection } from '../modules/properties';
import { usePropertyWizard } from '../modules/properties/hooks/usePropertyWizard';

// Quick test page to verify PropertyTypeSelection component
const PropertyTypeTestPage: React.FC = () => {
  const wizard = usePropertyWizard();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Type Selection - Test Page
          </h1>
          <p className="text-gray-600">
            This page demonstrates the PropertyTypeSelection component
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <PropertyTypeSelection
            data={wizard.propertyData}
            errors={wizard.errors}
            onUpdate={wizard.updatePropertyData}
          />
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(wizard.propertyData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PropertyTypeTestPage;