import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Wrench,
  Calendar,
  FileText,
  Bell,
  Settings,
  Download,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface OwnerDashboardData {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacancyRate: number;
  monthlyRevenue: number;
  expenses: number;
  netIncome: number;
  maintenanceRequests: number;
  recentPayments: number;
  pendingApplications: number;
}

export default function OwnerPortalPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  // Mock data - replace with actual API calls
  const dashboardData: OwnerDashboardData = {
    totalProperties: 12,
    totalUnits: 156,
    occupiedUnits: 142,
    vacancyRate: 8.9,
    monthlyRevenue: 245000,
    expenses: 89000,
    netIncome: 156000,
    maintenanceRequests: 23,
    recentPayments: 127,
    pendingApplications: 8
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'warning';
      case 'poor':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Owner Portal</h1>
          <p className="text-gray-600 mt-1">
            Monitor your property portfolio performance and financials
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.totalProperties}
              </p>
              <p className="text-sm text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +2 this month
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(100 - dashboardData.vacancyRate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {dashboardData.occupiedUnits} of {dashboardData.totalUnits} units
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.monthlyRevenue)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12.5% vs last month
              </p>
            </div>
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.netIncome)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                <ArrowUpRight className="h-3 w-3 inline mr-1" />
                Profit margin: 63.7%
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(dashboardData.monthlyRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operating Expenses</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(dashboardData.expenses)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-900">Net Operating Income</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(dashboardData.netIncome)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Expense Breakdown</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Maintenance & Repairs</span>
                <span className="text-gray-900">{formatCurrency(25000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Property Management</span>
                <span className="text-gray-900">{formatCurrency(18000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Utilities</span>
                <span className="text-gray-900">{formatCurrency(15000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Insurance & Taxes</span>
                <span className="text-gray-900">{formatCurrency(12000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Marketing & Leasing</span>
                <span className="text-gray-900">{formatCurrency(8000)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Other</span>
                <span className="text-gray-900">{formatCurrency(11000)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Rent per Unit</span>
              <span className="font-medium text-gray-900">{formatCurrency(1571)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Turnover Rate</span>
              <span className="font-medium text-gray-900">12.3%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Days Vacant</span>
              <span className="font-medium text-gray-900">18 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Maintenance Cost per Unit</span>
              <span className="font-medium text-gray-900">{formatCurrency(160)}</span>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Property Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Excellent Performance</span>
                </div>
                <Badge variant="success">8 Properties</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="text-sm text-gray-600">Good Performance</span>
                </div>
                <Badge variant="warning">3 Properties</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-gray-600">Needs Attention</span>
                </div>
                <Badge variant="danger">1 Property</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity and Communications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Payment received from John Smith
                </p>
                <p className="text-sm text-gray-500">
                  Apartment 2B - Oak Street Complex
                </p>
                <p className="text-xs text-gray-400">2 hours ago</p>
              </div>
              <div className="text-sm font-medium text-green-600">
                {formatCurrency(1200)}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Wrench className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Maintenance completed
                </p>
                <p className="text-sm text-gray-500">
                  Plumbing repair - Maple Avenue Apartments
                </p>
                <p className="text-xs text-gray-400">5 hours ago</p>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(250)}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New tenant application
                </p>
                <p className="text-sm text-gray-500">
                  Apartment 3A - Pine Street Residences
                </p>
                <p className="text-xs text-gray-400">1 day ago</p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Lease renewal completed
                </p>
                <p className="text-sm text-gray-500">
                  Sarah Johnson - Cedar Street Complex
                </p>
                <p className="text-xs text-gray-400">2 days ago</p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Communications</h3>
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Monthly Financial Report
                </h4>
                <Badge variant="secondary">Monthly</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Your October 2024 financial summary is ready for review.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Sent 3 days ago</span>
                <Button variant="ghost" size="sm">
                  View Report
                </Button>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Property Inspection Scheduled
                </h4>
                <Badge variant="warning">Action Required</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Annual inspection scheduled for Pine Street Apartments on Nov 15.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Sent 1 week ago</span>
                <Button variant="ghost" size="sm">
                  Schedule
                </Button>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Tax Documents Available
                </h4>
                <Badge variant="success">New</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                2024 tax documents are now available for download.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Sent 2 weeks ago</span>
                <Button variant="ghost" size="sm">
                  Download
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Home className="h-6 w-6 mb-2" />
            <span className="text-sm">Add Property</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <FileText className="h-6 w-6 mb-2" />
            <span className="text-sm">Generate Report</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Bell className="h-6 w-6 mb-2" />
            <span className="text-sm">Set Alerts</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Users className="h-6 w-6 mb-2" />
            <span className="text-sm">View Tenants</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Wrench className="h-6 w-6 mb-2" />
            <span className="text-sm">Maintenance</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <DollarSign className="h-6 w-6 mb-2" />
            <span className="text-sm">Financials</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}