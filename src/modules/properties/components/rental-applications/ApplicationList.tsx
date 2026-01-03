import { useState } from 'react';
import { 
  User, 
  FileText, 
  Calendar, 
  Mail, 
  Phone, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileCheck
} from 'lucide-react';
import type { Application } from '../../../../types';
import { ApplicationService } from '../../../../services/applications';
import toast from 'react-hot-toast';

interface ApplicationListProps {
  applications: Application[];
  onReview: (application: Application) => void;
  onApplicationUpdate: () => void;
}

export default function ApplicationList({ applications, onReview, onApplicationUpdate }: ApplicationListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAction = async (action: string, application: Application) => {
    setActionLoading(application.id);
    try {
      switch (action) {
        case 'submit':
          await ApplicationService.submitApplication(application.id);
          toast.success('Application submitted successfully');
          onApplicationUpdate();
          break;
        case 'view':
          // Navigate to application details
          window.open(`/applications/${application.id}`, '_blank');
          break;
        case 'documents':
          // Navigate to documents
          window.open(`/applications/${application.id}/documents`, '_blank');
          break;
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} application`);
    } finally {
      setActionLoading(null);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
        <p className="text-gray-600">
          Create your first rental application to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applicant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property/Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employment & Income
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Application Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((application) => (
              <tr key={application.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {application.first_name} {application.last_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {application.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {application.phone}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {application.property?.name || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Unit {application.unit?.unit_number || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {application.employment?.employer_name || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {application.employment?.job_title || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-900 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${application.employment?.monthly_income?.toLocaleString() || 'N/A'}/month
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(application.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(application.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(application.status)}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleAction('view', application)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {application.status === 'draft' ? (
                      <button
                        onClick={() => handleAction('submit', application)}
                        disabled={actionLoading === application.id}
                        className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    ) : application.status === 'submitted' || application.status === 'under_review' ? (
                      <button
                        onClick={() => onReview(application)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Review
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleAction('documents', application)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="Documents"
                    >
                      <FileCheck className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}