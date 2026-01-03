import React, { useState } from 'react';
import { 
  useApplications, 
  useCreateApplication,
  useDeleteApplication
} from '../../hooks/useApplications';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { 
  Users,
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface ApplicationsPageProps {
  propertyId?: string;
}

export function ApplicationsPage({ propertyId }: ApplicationsPageProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { 
    data: applications, 
    isLoading, 
    error,
    refetch 
  } = useApplications({
    property_id: propertyId,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    search: searchQuery || undefined,
  });

  const deleteApplication = useDeleteApplication();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'submitted':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'under_review':
        return 'warning';
      case 'submitted':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteApplication = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await deleteApplication.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete application:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Applications</h3>
          <p className="text-gray-500 mb-4">Unable to load application data.</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalApplications = applications?.length || 0;
  const pendingReview = applications?.filter(app => ['submitted', 'under_review'].includes(app.status)).length || 0;
  const approved = applications?.filter(app => app.status === 'approved').length || 0;
  const rejected = applications?.filter(app => app.status === 'rejected').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">
            Manage rental applications, screening, and approvals
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{pendingReview}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approved}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejected}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="text-sm text-gray-500">
            {applications?.length} applications found
          </div>
        </div>
      </Card>

      {/* Applications Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Applications</h3>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {applications && applications.length > 0 ? (
          <Table
            headers={[
              'Applicant',
              'Property',
              'Status',
              'Submitted',
              'Screening',
              'Documents',
              'Actions'
            ]}
            rows={applications.map((application) => [
              <div key={`applicant-${application.id}`}>
                <div className="font-medium text-gray-900">
                  {application.first_name} {application.last_name}
                </div>
                <div className="text-sm text-gray-500">{application.email}</div>
              </div>,
              <div key={`property-${application.id}`}>
                <div className="font-medium text-gray-900">{application.property?.name}</div>
                <div className="text-sm text-gray-500">Unit {application.unit?.unit_number}</div>
              </div>,
              <div key={`status-${application.id}`} className="flex items-center">
                {getStatusIcon(application.status)}
                <Badge 
                  variant={getStatusBadgeVariant(application.status)}
                  className="ml-2"
                >
                  {application.status.replace('_', ' ')}
                </Badge>
              </div>,
              <div key={`submitted-${application.id}`} className="text-sm text-gray-600">
                {application.submitted_at ? formatDate(application.submitted_at) : 'Not submitted'}
              </div>,
              <div key={`screening-${application.id}`}>
                {application.screening_results && application.screening_results.length > 0 ? (
                  <Badge variant="info">
                    {application.screening_results[0].status}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-500">Not started</span>
                )}
              </div>,
              <div key={`documents-${application.id}`} className="text-sm text-gray-600">
                {application.documents?.length || 0} files
              </div>,
              <div key={`actions-${application.id}`} className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteApplication(application.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>,
            ])}
            className="mt-4"
          />
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first application.'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Application
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}