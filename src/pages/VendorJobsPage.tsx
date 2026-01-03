/**
 * Vendor Jobs List Page
 * Displays all assigned work orders with filtering and search capabilities
 */

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRequireVendorAuth } from '../contexts/VendorAuthContext';
import { getAssignedWorkOrders } from '../services/vendorAuthService';
import VendorLayout from '../layouts/VendorLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  ChevronRight,
} from 'lucide-react';

export default function VendorJobsPage() {
  const { vendor } = useRequireVendorAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>(
    searchParams.get('priority') || 'all'
  );

  useEffect(() => {
    if (vendor) {
      loadWorkOrders();
    }
  }, [vendor]);

  useEffect(() => {
    applyFilters();
  }, [workOrders, searchTerm, statusFilter, priorityFilter]);

  const loadWorkOrders = async () => {
    if (!vendor) return;

    try {
      setLoading(true);
      const orders = await getAssignedWorkOrders(vendor.id);
      setWorkOrders(orders);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...workOrders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((order) => order.priority === priorityFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      assigned: 'warning',
      in_progress: 'primary',
      completed: 'success',
      cancelled: 'danger',
    };
    return variants[status] || 'secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'warning',
      high: 'danger',
      urgent: 'danger',
    };
    return variants[priority] || 'secondary';
  };

  const getStatusCounts = () => {
    return {
      all: workOrders.length,
      pending: workOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length,
      in_progress: workOrders.filter((o) => o.status === 'in_progress').length,
      completed: workOrders.filter((o) => o.status === 'completed').length,
    };
  };

  const counts = getStatusCounts();

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your assigned work orders and tasks</p>
        </div>

        {/* Status Tabs */}
        <Card className="p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              In Progress ({counts.in_progress})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Completed ({counts.completed})
            </button>
          </div>
        </Card>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs by title, property, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Work Orders List */}
        <Card className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading work orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No work orders found</p>
              {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/vendor/jobs/${order.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Title and Badges */}
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">{order.title}</h3>
                      <Badge variant={getPriorityBadge(order.priority)}>{order.priority}</Badge>
                      <Badge variant={getStatusBadge(order.status)}>{order.status}</Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{order.description}</p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {order.properties?.name || 'Unknown Property'}
                      </div>
                      {order.units?.unit_number && (
                        <div className="flex items-center">
                          <span>Unit {order.units.unit_number}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      {order.due_date && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Due {new Date(order.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" />
                </div>
              </Link>
            ))
          )}
        </Card>

        {/* Results Count */}
        {!loading && filteredOrders.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            Showing {filteredOrders.length} of {workOrders.length} work order
            {workOrders.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
