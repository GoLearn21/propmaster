import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui';
import { Building2, TrendingUp, DollarSign } from 'lucide-react';
import { PropertyPerformance } from '../../services/dashboardService';

interface PropertyPerformanceTableProps {
  properties: PropertyPerformance[];
  loading?: boolean;
}

export const PropertyPerformanceTable: React.FC<PropertyPerformanceTableProps> = ({ properties, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
          <CardDescription>Performance metrics by property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
          <CardDescription>Performance metrics by property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <p className="text-neutral-medium">No properties found</p>
            <p className="text-sm text-neutral-light mt-2">Add properties to see performance metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Performance</CardTitle>
        <CardDescription>Key metrics for each property in your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-light">
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-medium uppercase">Property</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-medium uppercase">Units</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-medium uppercase">Occupancy</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-neutral-medium uppercase">Monthly Revenue</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const occupancyColor = 
                  property.occupancyRate >= 95 ? 'text-status-success' :
                  property.occupancyRate >= 80 ? 'text-status-info' :
                  property.occupancyRate >= 60 ? 'text-status-warning' :
                  'text-status-error';

                const statusVariant = 
                  property.occupancyRate >= 95 ? 'success' :
                  property.occupancyRate >= 80 ? 'info' :
                  property.occupancyRate >= 60 ? 'warning' :
                  'error';

                const statusText = 
                  property.occupancyRate >= 95 ? 'Excellent' :
                  property.occupancyRate >= 80 ? 'Good' :
                  property.occupancyRate >= 60 ? 'Fair' :
                  'Needs Attention';

                return (
                  <tr key={property.id} className="border-b border-neutral-lighter hover:bg-neutral-lighter/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-black">{property.name}</p>
                          <p className="text-xs text-neutral-medium">
                            {property.occupied} / {property.units} occupied
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="font-medium text-neutral-black">{property.units}</p>
                      <p className="text-xs text-neutral-medium">{property.occupied} occupied</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <p className={`font-bold text-lg ${occupancyColor}`}>
                          {property.occupancyRate.toFixed(1)}%
                        </p>
                        <div className="w-24 h-2 bg-neutral-lighter rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              property.occupancyRate >= 95 ? 'bg-status-success' :
                              property.occupancyRate >= 80 ? 'bg-status-info' :
                              property.occupancyRate >= 60 ? 'bg-status-warning' :
                              'bg-status-error'
                            }`}
                            style={{ width: `${property.occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign className="h-4 w-4 text-accent-green" />
                        <p className="font-semibold text-neutral-black">
                          ${property.monthlyRevenue.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-medium text-right">per month</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant={statusVariant as any}>
                        {statusText}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-light">
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Total Properties</p>
            <p className="text-xl font-bold text-primary">{properties.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Total Units</p>
            <p className="text-xl font-bold text-neutral-black">
              {properties.reduce((sum, p) => sum + p.units, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-accent-green">
              ${properties.reduce((sum, p) => sum + p.monthlyRevenue, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
