import { useState, useEffect } from 'react';
import { FileText, Users, Clock, CheckCircle, XCircle, Plus, AlertTriangle } from 'lucide-react';
import type { Application } from '../../../../types';
import { ApplicationService } from '../../../../services/applications';
import ApplicationList from './ApplicationList';
import ApplicationReviewModal from './ApplicationReviewModal';
import ApplicationStatsCards from './ApplicationStatsCards';
import CreateApplicationModal from './CreateApplicationModal';

interface RentalApplicationsProps {
  propertyId?: string;
  onApplicationUpdate?: () => void;
}

export default function RentalApplications({ propertyId, onApplicationUpdate }: RentalApplicationsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadApplications();
  }, [propertyId, filter, refreshTrigger]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const filters = {
        ...(propertyId && { property_id: propertyId }),
        ...(filter !== 'all' && { status: filter })
      };

      const applicationsData = await ApplicationService.getApplications(filters);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    onApplicationUpdate?.();
    setShowCreateModal(false);
  };

  const handleApplicationReviewed = () => {
    setRefreshTrigger(prev => prev + 1);
    onApplicationUpdate?.();
    setSelectedApplication(null);
    setShowReviewModal(false);
  };

  const handleReview = (application: Application) => {
    setSelectedApplication(application);
    setShowReviewModal(true);
  };

  const stats = {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const pendingCount = stats.submitted + stats.under_review;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rental Applications</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage rental applications and track tenant screening
          </p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{pendingCount} pending review</span>
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            New Application
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <ApplicationStatsCards stats={stats} />

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Applications', count: stats.total },
            { key: 'submitted', label: 'Submitted', count: stats.submitted },
            { key: 'under_review', label: 'Under Review', count: stats.under_review },
            { key: 'approved', label: 'Approved', count: stats.approved },
            { key: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  filter === tab.key
                    ? 'bg-teal-100 text-teal-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Applications List */}
      <ApplicationList 
        applications={applications}
        onReview={handleReview}
        onApplicationUpdate={() => setRefreshTrigger(prev => prev + 1)}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateApplicationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleApplicationCreated}
          propertyId={propertyId}
        />
      )}

      {showReviewModal && selectedApplication && (
        <ApplicationReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedApplication(null);
          }}
          onSuccess={handleApplicationReviewed}
          application={selectedApplication}
        />
      )}
    </div>
  );
}