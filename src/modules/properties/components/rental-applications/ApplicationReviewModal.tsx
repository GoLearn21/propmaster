import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, FileText, User, DollarSign, Phone, Mail } from 'lucide-react';
import type { Application } from '../../../../types';
import { ApplicationService } from '../../../../services/applications';
import toast from 'react-hot-toast';

interface ApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  application: Application;
}

export default function ApplicationReviewModal({
  isOpen,
  onClose,
  onSuccess,
  application
}: ApplicationReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected' | 'needs_info',
    decision_reason: '',
    conditions: [] as string[],
    notes: '',
    credit_score_rating: 5,
    income_adequacy_rating: 5,
    rental_history_rating: 5,
    overall_rating: 5,
    lease_terms: {
      rent_amount: 0,
      security_deposit: 0,
      lease_start_date: '',
      lease_end_date: '',
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reviewRecord = {
        reviewer_id: 'current-user-id', // This would be actual user ID
        reviewer_name: 'Current User', // This would be actual user name
        status: reviewData.status,
        decision_reason: reviewData.decision_reason,
        conditions: reviewData.conditions,
        notes: reviewData.notes,
        credit_score_rating: reviewData.credit_score_rating,
        income_adequacy_rating: reviewData.income_adequacy_rating,
        rental_history_rating: reviewData.rental_history_rating,
        overall_rating: reviewData.overall_rating,
        lease_terms: reviewData.status === 'approved' ? reviewData.lease_terms : undefined,
        follow_up_required: reviewData.status === 'needs_info',
      };

      await ApplicationService.createApplicationReview(application.id, reviewRecord);
      toast.success('Application review completed successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete review');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const addCondition = () => {
    const newCondition = prompt('Enter condition:');
    if (newCondition) {
      setReviewData(prev => ({
        ...prev,
        conditions: [...prev.conditions, newCondition]
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <User className="w-8 h-8 text-teal-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Review Application
              </h2>
              <p className="text-sm text-gray-600">
                {application.first_name} {application.last_name} - {application.property?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Application Details */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Applicant Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{application.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{application.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{application.date_of_birth}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Employment & Income</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Employer:</strong> {application.employment?.employer_name}</p>
                <p><strong>Position:</strong> {application.employment?.job_title}</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>${application.employment?.monthly_income?.toLocaleString()}/month</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Current Address</h3>
              <div className="text-sm">
                <p>{application.current_address?.street}</p>
                <p>{application.current_address?.city}, {application.current_address?.state} {application.current_address?.zip}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Emergency Contact</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {application.emergency_contact?.name}</p>
                <p><strong>Relationship:</strong> {application.emergency_contact?.relationship}</p>
                <p><strong>Phone:</strong> {application.emergency_contact?.phone}</p>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Decision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewData(prev => ({ ...prev, status: 'approved' }))}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg ${
                    reviewData.status === 'approved'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewData(prev => ({ ...prev, status: 'needs_info' }))}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg ${
                    reviewData.status === 'needs_info'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">Needs Info</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewData(prev => ({ ...prev, status: 'rejected' }))}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg ${
                    reviewData.status === 'rejected'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Reject</span>
                </button>
              </div>
            </div>

            {/* Scoring */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Scores (1-10)
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Credit Score Rating</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reviewData.credit_score_rating}
                    onChange={(e) => setReviewData(prev => ({ ...prev, credit_score_rating: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">{reviewData.credit_score_rating}/10</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Income Adequacy Rating</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reviewData.income_adequacy_rating}
                    onChange={(e) => setReviewData(prev => ({ ...prev, income_adequacy_rating: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">{reviewData.income_adequacy_rating}/10</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Rental History Rating</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reviewData.rental_history_rating}
                    onChange={(e) => setReviewData(prev => ({ ...prev, rental_history_rating: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">{reviewData.rental_history_rating}/10</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Overall Rating</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reviewData.overall_rating}
                    onChange={(e) => setReviewData(prev => ({ ...prev, overall_rating: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">{reviewData.overall_rating}/10</div>
                </div>
              </div>
            </div>

            {/* Lease Terms (if approving) */}
            {reviewData.status === 'approved' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Lease Terms</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Monthly Rent"
                    value={reviewData.lease_terms.rent_amount}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      lease_terms: { ...prev.lease_terms, rent_amount: parseFloat(e.target.value) }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Security Deposit"
                    value={reviewData.lease_terms.security_deposit}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      lease_terms: { ...prev.lease_terms, security_deposit: parseFloat(e.target.value) }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    placeholder="Lease Start Date"
                    value={reviewData.lease_terms.lease_start_date}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      lease_terms: { ...prev.lease_terms, lease_start_date: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    placeholder="Lease End Date"
                    value={reviewData.lease_terms.lease_end_date}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      lease_terms: { ...prev.lease_terms, lease_end_date: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Conditions */}
            {reviewData.status === 'approved' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Special Conditions
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    + Add Condition
                  </button>
                </div>
                <div className="space-y-2">
                  {reviewData.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 text-sm">{condition}</span>
                      <button
                        type="button"
                        onClick={() => setReviewData(prev => ({
                          ...prev,
                          conditions: prev.conditions.filter((_, i) => i !== index)
                        }))}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decision Reason
              </label>
              <textarea
                value={reviewData.decision_reason}
                onChange={(e) => setReviewData(prev => ({ ...prev, decision_reason: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Brief explanation of the decision..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reviewer Notes
              </label>
              <textarea
                value={reviewData.notes}
                onChange={(e) => setReviewData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Additional notes for internal use..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Complete ${reviewData.status === 'approved' ? 'Approval' : reviewData.status === 'rejected' ? 'Rejection' : 'Review'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}