/**
 * Maintenance Request Detail Page
 * Shows full details of a maintenance request including:
 * - Request information
 * - Photos
 * - Status timeline
 * - Actions (cancel, rate)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  AlertTriangle,
  X,
  Star,
  MessageSquare,
  Image as ImageIcon,
  Droplet,
  Zap,
  Thermometer,
  UtensilsCrossed,
  Hammer,
  PaintBucket,
  LayoutGrid,
  Home,
  Leaf,
  Sparkles,
  HelpCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import MaintenanceStatusTimeline, {
  StatusProgressIndicator,
  ExpectedTimeline,
  TimelineSkeleton,
} from '../../components/tenant/MaintenanceStatusTimeline';
import { ImagePreviewGrid, ImageLightbox } from '../../components/tenant/ImageUploader';
import {
  getMaintenanceRequest,
  cancelMaintenanceRequest,
  submitMaintenanceFeedback,
  subscribeToMaintenanceRequest,
  MaintenanceRequest,
  MaintenanceCategory,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
  getEmergencyInfo,
} from '../../services/tenant/tenantMaintenanceService';

/**
 * Category icons
 */
const CATEGORY_ICONS: Record<MaintenanceCategory, React.ElementType> = {
  plumbing: Droplet,
  electrical: Zap,
  hvac: Thermometer,
  appliances: UtensilsCrossed,
  carpentry: Hammer,
  painting: PaintBucket,
  flooring: LayoutGrid,
  roofing: Home,
  landscaping: Leaf,
  cleaning: Sparkles,
  other: HelpCircle,
};

export default function TenantMaintenanceDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { tenant } = useRequireTenantAuth();
  const navigate = useNavigate();

  // Data states
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Rating states
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const emergencyInfo = getEmergencyInfo();

  /**
   * Load maintenance request
   */
  useEffect(() => {
    if (tenant && requestId) {
      loadRequest();
    }
  }, [tenant, requestId]);

  /**
   * Subscribe to real-time updates
   */
  useEffect(() => {
    if (!requestId) return;

    const channel = subscribeToMaintenanceRequest(requestId, () => {
      loadRequest();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [requestId]);

  /**
   * Load request data
   */
  async function loadRequest() {
    if (!tenant || !requestId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMaintenanceRequest(requestId, tenant.id);

      if (!data) {
        setError('Maintenance request not found');
        return;
      }

      setRequest(data);
    } catch (err) {
      console.error('Error loading request:', err);
      setError('Failed to load maintenance request');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle cancel request
   */
  async function handleCancel() {
    if (!tenant || !requestId) return;

    setCancelling(true);
    try {
      const result = await cancelMaintenanceRequest(requestId, tenant.id, cancelReason);
      if (result.success) {
        setShowCancelModal(false);
        await loadRequest();
      } else {
        alert(result.error || 'Failed to cancel request');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert('Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  }

  /**
   * Handle rating submission
   */
  async function handleSubmitRating() {
    if (!tenant || !requestId || rating === 0) return;

    setSubmittingRating(true);
    try {
      const result = await submitMaintenanceFeedback(requestId, tenant.id, rating, feedback);
      if (result.success) {
        setShowRatingModal(false);
        await loadRequest();
      } else {
        alert(result.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  }

  /**
   * Open lightbox
   */
  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-neutral-light rounded mb-6" />
            <Card className="p-6 mb-6">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-neutral-light rounded-lg" />
                <div className="flex-1">
                  <div className="h-6 w-64 bg-neutral-light rounded mb-2" />
                  <div className="h-4 w-48 bg-neutral-light rounded mb-4" />
                  <div className="h-4 w-full bg-neutral-light rounded mb-2" />
                  <div className="h-4 w-3/4 bg-neutral-light rounded" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <TimelineSkeleton />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !request) {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 mb-6">
              <XCircle className="h-8 w-8 text-error" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              {error || 'Request Not Found'}
            </h2>
            <p className="text-neutral-dark mb-6">
              The maintenance request you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/tenant/maintenance')}>
              Back to Maintenance
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[request.category];
  const statusInfo = MAINTENANCE_STATUSES[request.status];
  const priorityInfo = MAINTENANCE_PRIORITIES[request.priority];
  const canCancel = request.status === 'open';
  const canRate = request.status === 'completed' && !request.tenant_rating;

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/tenant/maintenance"
            className="inline-flex items-center text-sm text-neutral hover:text-neutral-dark transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Maintenance
          </Link>
        </div>

        {/* Main Request Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Icon */}
            <div className={`
              flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center
              ${request.status === 'completed' ? 'bg-success/10 text-success' :
                request.status === 'cancelled' ? 'bg-neutral/10 text-neutral' :
                'bg-primary/10 text-primary'}
            `}>
              <CategoryIcon className="h-8 w-8" />
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <h1 className="text-xl font-bold text-neutral-darkest">
                  {request.title}
                </h1>
                <span className={`
                  inline-flex px-3 py-1 text-sm font-medium rounded-full
                  ${request.status === 'open' ? 'bg-primary/10 text-primary' :
                    request.status === 'assigned' ? 'bg-secondary/10 text-secondary' :
                    request.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                    request.status === 'completed' ? 'bg-success/10 text-success' :
                    'bg-neutral/10 text-neutral'}
                `}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral mb-4">
                <span>{MAINTENANCE_CATEGORIES[request.category].label}</span>
                <span className={`flex items-center gap-1 ${
                  request.priority === 'emergency' || request.priority === 'high'
                    ? 'text-error' : 'text-warning'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {priorityInfo.label} Priority
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(request.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Status Progress */}
              <div className="mb-4">
                <StatusProgressIndicator currentStatus={request.status} />
              </div>

              {/* Expected Timeline */}
              {request.status !== 'completed' && request.status !== 'cancelled' && (
                <div className="mb-4">
                  <ExpectedTimeline
                    priority={request.priority}
                    createdAt={request.created_at}
                    scheduledDate={request.scheduled_date}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Description & Details */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-neutral-darkest mb-4">Details</h2>

          {/* Description */}
          {request.description && (
            <div className="mb-4">
              <p className="text-neutral-dark whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Location */}
          {request.location && (
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="h-4 w-4 text-neutral mt-0.5" />
              <span className="text-neutral-dark">{request.location}</span>
            </div>
          )}

          {/* Entry Permission */}
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className={`h-4 w-4 mt-0.5 ${request.entry_permission ? 'text-success' : 'text-warning'}`} />
            <span className="text-neutral-dark">
              {request.entry_permission
                ? 'Permission granted to enter when not home'
                : 'Please contact before entering'}
            </span>
          </div>

          {/* Preferred Time */}
          {request.tenant_preferred_time && (
            <div className="flex items-start gap-2 mb-3">
              <Calendar className="h-4 w-4 text-neutral mt-0.5" />
              <span className="text-neutral-dark">{request.tenant_preferred_time}</span>
            </div>
          )}

          {/* Additional Notes */}
          {request.tenant_notes && (
            <div className="mt-4 pt-4 border-t border-neutral-light">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-neutral mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neutral-dark mb-1">Additional Notes</p>
                  <p className="text-neutral-dark">{request.tenant_notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Scheduled Visit */}
        {request.scheduled_date && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-neutral-darkest mb-4">Scheduled Visit</h2>
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-neutral-darkest">
                    {new Date(request.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {request.scheduled_time_start && request.scheduled_time_end && (
                    <p className="text-sm text-neutral-dark">
                      {request.scheduled_time_start} - {request.scheduled_time_end}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Assigned Vendor */}
        {request.vendor && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-neutral-darkest mb-4">Assigned Technician</h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-neutral-darkest">
                  {request.vendor.first_name} {request.vendor.last_name}
                </p>
                {request.vendor.company_name && (
                  <p className="text-sm text-neutral">{request.vendor.company_name}</p>
                )}
                {request.vendor.phone && (
                  <a
                    href={`tel:${request.vendor.phone}`}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark mt-2"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {request.vendor.phone}
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Photos */}
        {request.images && request.images.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-neutral" />
              <h2 className="font-semibold text-neutral-darkest">
                Photos ({request.images.length})
              </h2>
            </div>
            <ImagePreviewGrid
              images={request.images}
              onImageClick={openLightbox}
            />
          </Card>
        )}

        {/* Status Timeline */}
        {request.status_history && request.status_history.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-neutral-darkest mb-4">Status History</h2>
            <MaintenanceStatusTimeline
              history={request.status_history}
              currentStatus={request.status}
            />
          </Card>
        )}

        {/* Rating (if completed and already rated) */}
        {request.tenant_rating && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-neutral-darkest mb-4">Your Rating</h2>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= request.tenant_rating!
                      ? 'text-warning fill-current'
                      : 'text-neutral-light'
                  }`}
                />
              ))}
              <span className="ml-2 text-neutral-dark">
                {request.tenant_rating}/5
              </span>
            </div>
            {request.tenant_feedback && (
              <p className="text-neutral-dark mt-2">{request.tenant_feedback}</p>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {canRate && (
            <Button
              variant="primary"
              onClick={() => setShowRatingModal(true)}
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-2" />
              Rate Service
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(true)}
              className="flex-1 text-error hover:bg-error/5"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Request
            </Button>
          )}
        </div>

        {/* Emergency Banner */}
        {request.status !== 'completed' && request.status !== 'cancelled' && (
          <Card className="p-4 bg-error/5 border-error/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-error">Need urgent help?</p>
                  <p className="text-sm text-neutral-dark">
                    For emergencies, call us directly.
                  </p>
                </div>
              </div>
              <a
                href={`tel:${emergencyInfo.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors flex-shrink-0"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </a>
            </div>
          </Card>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-neutral-darkest mb-2">
              Cancel Request?
            </h3>
            <p className="text-neutral-dark mb-4">
              Are you sure you want to cancel this maintenance request? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this request?"
                className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1"
              >
                Keep Request
              </Button>
              <Button
                variant="primary"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 bg-error hover:bg-error/90"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-neutral-darkest mb-2">
              Rate Your Experience
            </h3>
            <p className="text-neutral-dark mb-4">
              How was the maintenance service?
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? 'text-warning fill-current'
                        : 'text-neutral-light hover:text-warning/50'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating Label */}
            <p className="text-center text-sm text-neutral mb-4">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>

            {/* Feedback */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setFeedback('');
                }}
                disabled={submittingRating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRating}
                disabled={rating === 0 || submittingRating}
                className="flex-1"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && request.images && (
        <ImageLightbox
          images={request.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
          onNext={() => setLightboxIndex(Math.min(request.images!.length - 1, lightboxIndex + 1))}
        />
      )}
    </div>
  );
}
