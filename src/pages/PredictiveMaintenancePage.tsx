import React, { useState, useEffect } from 'react';
import { predictiveMaintenanceService, type MaintenanceAsset as MaintenanceAssetType } from '../services/predictiveMaintenanceService';
import { 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  Zap,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type MaintenanceAsset = MaintenanceAssetType;

const MOCK_ASSETS: MaintenanceAsset[] = [
  {
    id: '1',
    name: 'HVAC Unit #1',
    type: 'hvac',
    property: 'Downtown Lofts',
    location: 'Rooftop - East Wing',
    installDate: '2018-03-15',
    lastService: '2025-09-10',
    nextService: '2025-12-10',
    failureProbability: 72,
    healthScore: 65,
    estimatedCost: 850,
    priority: 'high'
  },
  {
    id: '2',
    name: 'Water Heater - Building A',
    type: 'plumbing',
    property: 'Riverside Complex',
    location: 'Basement - Mechanical Room',
    installDate: '2020-06-20',
    lastService: '2025-10-15',
    nextService: '2026-04-15',
    failureProbability: 35,
    healthScore: 82,
    estimatedCost: 450,
    priority: 'low'
  },
  {
    id: '3',
    name: 'Elevator Motor #2',
    type: 'electrical',
    property: 'Sunset Apartments',
    location: 'Elevator Shaft',
    installDate: '2016-01-10',
    lastService: '2025-10-20',
    nextService: '2025-11-20',
    failureProbability: 85,
    healthScore: 52,
    estimatedCost: 1250,
    priority: 'critical'
  },
  {
    id: '4',
    name: 'Commercial Refrigerator',
    type: 'appliance',
    property: 'Downtown Lofts',
    location: 'Common Area Kitchen',
    installDate: '2019-08-05',
    lastService: '2025-11-01',
    nextService: '2026-05-01',
    failureProbability: 28,
    healthScore: 88,
    estimatedCost: 320,
    priority: 'low'
  },
  {
    id: '5',
    name: 'Roof Membrane Section B',
    type: 'structural',
    property: 'Riverside Complex',
    location: 'Rooftop',
    installDate: '2017-04-12',
    lastService: '2025-08-22',
    nextService: '2026-08-22',
    failureProbability: 58,
    healthScore: 71,
    estimatedCost: 2800,
    priority: 'medium'
  }
];

const FAILURE_TRENDS = [
  { month: 'May', predicted: 3, actual: 2 },
  { month: 'Jun', predicted: 2, actual: 3 },
  { month: 'Jul', predicted: 4, actual: 4 },
  { month: 'Aug', predicted: 3, actual: 2 },
  { month: 'Sep', predicted: 2, actual: 2 },
  { month: 'Oct', predicted: 5, actual: 4 },
  { month: 'Nov', predicted: 3, actual: null }
];

const COST_SAVINGS = [
  { category: 'Preventive', amount: 12500 },
  { category: 'Avoided Emergency', amount: 18700 },
  { category: 'Optimized Scheduling', amount: 8300 }
];

const COLORS = ['#20B2AA', '#00CC66', '#EF4A81'];

const TYPE_CONFIG = {
  hvac: { label: 'HVAC', icon: Zap, color: 'text-blue-600' },
  plumbing: { label: 'Plumbing', icon: Activity, color: 'text-cyan-600' },
  electrical: { label: 'Electrical', icon: Zap, color: 'text-yellow-600' },
  appliance: { label: 'Appliance', icon: Wrench, color: 'text-purple-600' },
  structural: { label: 'Structural', icon: Wrench, color: 'text-gray-600' }
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  low: { label: 'Low', color: 'bg-green-100 text-green-700 border-green-300' }
};

export default function PredictiveMaintenancePage() {
  const [assets, setAssets] = useState<MaintenanceAsset[]>(MOCK_ASSETS);
  const [loading, setLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const data = await predictiveMaintenanceService.getAssets();
        if (data && data.length > 0) {
          setAssets(data);
        }
      } catch (error) {
        console.error('Failed to load maintenance assets, using fallback data:', error);
        // Keep fallback data on error
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  // Calculate metrics
  const metrics = {
    totalAssets: assets.length,
    criticalAssets: assets.filter(a => a.priority === 'critical').length,
    highRiskAssets: assets.filter(a => a.failureProbability >= 70).length,
    avgHealthScore: Math.round(assets.reduce((sum, a) => sum + a.healthScore, 0) / assets.length),
    estimatedMonthlyCost: assets.filter(a => a.failureProbability >= 50).reduce((sum, a) => sum + a.estimatedCost, 0),
    totalSavings: COST_SAVINGS.reduce((sum, item) => sum + item.amount, 0)
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskColor = (prob: number) => {
    if (prob >= 70) return 'text-red-600';
    if (prob >= 50) return 'text-orange-600';
    if (prob >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-darker">Predictive Maintenance</h1>
          <p className="text-neutral-medium mt-1">AI-driven maintenance predictions and optimization</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Total Assets</p>
              <p className="text-3xl font-bold text-neutral-darker mt-1">{metrics.totalAssets}</p>
            </div>
            <Wrench className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics.criticalAssets}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">High Risk</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{metrics.highRiskAssets}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Avg Health</p>
              <p className={`text-3xl font-bold mt-1 ${getHealthColor(metrics.avgHealthScore)}`}>
                {metrics.avgHealthScore}
              </p>
            </div>
            <Activity className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Est. Monthly Cost</p>
              <p className="text-3xl font-bold text-neutral-darker mt-1">
                ${(metrics.estimatedMonthlyCost / 1000).toFixed(1)}k
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Total Savings</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                ${(metrics.totalSavings / 1000).toFixed(1)}k
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Predictions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h3 className="text-lg font-semibold text-neutral-darker mb-4">
            Failure Predictions vs Actual
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={FAILURE_TRENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="predicted" fill="#20B2AA" name="AI Predicted" />
              <Bar dataKey="actual" fill="#00CC66" name="Actual Failures" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Savings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h3 className="text-lg font-semibold text-neutral-darker mb-4">
            Cost Savings Breakdown (This Year)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={COST_SAVINGS}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
              >
                {COST_SAVINGS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
        <div className="p-4 border-b border-neutral-light">
          <h3 className="text-lg font-semibold text-neutral-darker">Asset Health Monitor</h3>
        </div>
        <table className="w-full">
          <thead className="bg-neutral-lighter border-b border-neutral-light">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Asset</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Property</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Health Score</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Failure Risk</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Priority</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Next Service</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Est. Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {assets.map((asset) => {
              const typeConfig = TYPE_CONFIG[asset.type];
              const TypeIcon = typeConfig.icon;
              const priorityConfig = PRIORITY_CONFIG[asset.priority];
              
              return (
                <tr key={asset.id} className="hover:bg-neutral-lighter transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-lighter`}>
                        <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-darker">{asset.name}</div>
                        <div className="text-sm text-neutral-medium">{asset.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-neutral-lighter text-neutral-darker">
                      {typeConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-neutral-dark">{asset.property}</td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className={`text-lg font-bold ${getHealthColor(asset.healthScore)}`}>
                        {asset.healthScore}
                      </div>
                      <div className="w-20 bg-neutral-lighter rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getHealthBarColor(asset.healthScore)}`}
                          style={{ width: `${asset.healthScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className={`text-lg font-bold ${getRiskColor(asset.failureProbability)}`}>
                      {asset.failureProbability}%
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium border ${priorityConfig.color}`}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-dark">
                      <Calendar className="w-4 h-4" />
                      {asset.nextService}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-neutral-darker">
                    ${asset.estimatedCost.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
        <h3 className="text-lg font-semibold text-neutral-darker mb-4">AI-Powered Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Urgent Action Required</h4>
                <p className="text-sm text-red-700">
                  Elevator Motor #2 has 85% failure probability. Schedule maintenance within 7 days to avoid emergency repair costs.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Optimization Opportunity</h4>
                <p className="text-sm text-blue-700">
                  Combine 3 HVAC services scheduled for December to reduce vendor visit costs by $450.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">System Health Good</h4>
                <p className="text-sm text-green-700">
                  4 out of 5 tracked assets are performing within optimal parameters. Average health score: {metrics.avgHealthScore}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
