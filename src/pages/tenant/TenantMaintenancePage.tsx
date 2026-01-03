/**
 * Tenant Maintenance Page
 * List view of all maintenance requests with filtering and search
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import {
  Plus,
  Search,
  Filter,
  X,
  Phone,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import MaintenanceRequestCard, {
  MaintenanceRequestCardSkeleton,
  MaintenanceEmptyState,
} from '../../components/tenant/MaintenanceRequestCard';
import {
  getMaintenanceRequests,
  getMaintenanceRequestCounts,
  subscribeToAllMaintenanceRequests,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MAINTENANCE_STATUSES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  getEmergencyInfo,
} from '../../services/tenant/tenantMaintenanceService';

export default function TenantMaintenancePage() {
  const { tenant } = useRequireTenantAuth();
  const navigate = useNavigate();

  // Data states
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [counts, setCounts] = useState<Record<MaintenanceStatus, number>>({
    open: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    on_hold: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority[]>([]);

  const emergencyInfo = getEmergencyInfo();

  /**
   * Load maintenance requests
   */
  useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, statusFilter, categoryFilter, priorityFilter]);

  /**
   * Subscribe to real-time updates
   */
  useEffect(() => {
    if (!tenant) return;

    const channel = subscribeToAllMaintenanceRequests(tenant.id, () => {
      loadData();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenant]);

  /**
   * Load data
   */
  async function loadData() {
    if (!tenant) return;

    try {
      setLoading(true);

      // Load counts
      const countsData = await getMaintenanceRequestCounts(tenant.id);
      setCounts(countsData);

      // Build filters
      const filters: {
        status?: MaintenanceStatus[];
        category?: MaintenanceCategory[];
        priority?: MaintenancePriority[];
      } = {};

      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      if (categoryFilter.length > 0) {
        filters.category = categoryFilter;
      }
      if (priorityFilter.length > 0) {
        filters.priority = priorityFilter;
      }

      // Load requests
      const data = await getMaintenanceRequests(tenant.id, filters);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Filter requests by search query
   */
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.title.toLowerCase().includes(query) ||
      request.description?.toLowerCase().includes(query) ||
      request.category.toLowerCase().includes(query)
    );
  });

  /**
   * Count of active requests (open, assigned, in_progress)
   */
  const activeCount = counts.open + counts.assigned + counts.in_progress;

  /**
   * Status tabs
   */
  const statusTabs: Array<{ value: MaintenanceStatus | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { value: 'open', label: 'Open', count: counts.open },
    { value: 'assigned', label: 'Assigned', count: counts.assigned },
    { value: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { value: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-darkest">Maintenance</h1>
            <p className="text-neutral-dark mt-1">
              {activeCount > 0
                ? `${activeCount} active request${activeCount !== 1 ? 's' : ''}`
                : 'Submit and track maintenance requests'
              }
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/tenant/maintenance/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Emergency Banner */}
        <Card className="p-4 mb-6 bg-error/5 border-error/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-error">Emergency?</p>
                <p className="text-sm text-neutral-dark">
                  Gas leak, fire, flooding, or no heat? Call immediately.
                </p>
              </div>
            </div>
            <a
              href={`tel:${emergencyInfo.phone}`}
              className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors flex-shrink-0"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Call Now</span>
            </a>
          </div>
        </Card>

        {/* Status Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${statusFilter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-dark hover:bg-neutral-lightest border border-neutral-light'
                }
              `}
            >
              {tab.label}
              <span className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${statusFilter === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-lightest text-neutral'
                }
              `}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-neutral hover:text-neutral-dark" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-neutral-lightest' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(categoryFilter.length > 0 || priorityFilter.length > 0) && (
              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {categoryFilter.length + priorityFilter.length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-darkest">Filters</h3>
              {(categoryFilter.length > 0 || priorityFilter.length > 0) && (
                <button
                  onClick={() => {
                    setCategoryFilter([]);
                    setPriorityFilter([]);
                  }}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <p className="text-sm font-medium text-neutral-dark mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MAINTENANCE_CATEGORIES) as MaintenanceCategory[]).map((category) => {
                  const isSelected = categoryFilter.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setCategoryFilter(
                          isSelected
                            ? categoryFilter.filter((c) => c !== category)
                            : [...categoryFilter, category]
                        );
                      }}
                      className={`
                        px-3 py-1.5 rounded-full text-sm transition-colors
                        ${isSelected
                          ? 'bg-primary text-white'
                          : 'bg-neutral-lightest text-neutral-dark hover:bg-neutral-light'
                        }
                      `}
                    >
                      {MAINTENANCE_CATEGORIES[category].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <p className="text-sm font-medium text-neutral-dark mb-2">Priority</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MAINTENANCE_PRIORITIES) as MaintenancePriority[]).map((priority) => {
                  const isSelected = priorityFilter.includes(priority);
                  return (
                    <button
                      key={priority}
                      onClick={() => {
                        setPriorityFilter(
                          isSelected
                            ? priorityFilter.filter((p) => p !== priority)
                            : [...priorityFilter, priority]
                        );
                      }}
                      className={`
                        px-3 py-1.5 rounded-full text-sm transition-colors
                        ${isSelected
                          ? 'bg-primary text-white'
                          : 'bg-neutral-lightest text-neutral-dark hover:bg-neutral-light'
                        }
                      `}
                    >
                      {MAINTENANCE_PRIORITIES[priority].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Request List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <MaintenanceRequestCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <MaintenanceEmptyState
            status={statusFilter !== 'all' ? statusFilter : undefined}
            onCreateNew={() => navigate('/tenant/maintenance/new')}
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <MaintenanceRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}

        {/* Load More (if needed in future) */}
        {filteredRequests.length >= 20 && (
          <div className="text-center mt-8">
            <Button variant="outline">
              Load More
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
