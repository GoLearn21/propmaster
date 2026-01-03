/**
 * Lease Detail Page
 * Comprehensive lease view with all management capabilities
 * Features inspired by: DoorLoop, Rentvine, Buildium
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Edit,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Home,
  CreditCard,
  MoreVertical,
  Send,
  Eye,
  XCircle
} from 'lucide-react';
import { leaseService, Lease, LeasePayment, LeaseDocument } from '../services/leaseService';
import { getRenewalStatus, processLeaseRenewals, LeaseRenewalOffer } from '../services/leaseRenewalService';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'payments' | 'documents' | 'renewal';

export default function LeaseDetailPage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const [lease, setLease] = useState<Lease | null>(null);
  const [payments, setPayments] = useState<LeasePayment[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [renewalOffer, setRenewalOffer] = useState<LeaseRenewalOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (leaseId) {
      loadLeaseData();
    }
  }, [leaseId]);

  const loadLeaseData = async () => {
    if (!leaseId) return;

    setLoading(true);
    try {
      const [leaseData, paymentsData, docsData, renewalData] = await Promise.all([
        leaseService.getLeaseById(leaseId),
        leaseService.getLeasePayments(leaseId),
        leaseService.getLeaseDocuments(leaseId),
        getRenewalStatus(leaseId)
      ]);

      setLease(leaseData);
      setPayments(paymentsData);
      setDocuments(docsData);
      setRenewalOffer(renewalData);
    } catch (error) {
      console.error('Error loading lease data:', error);
      toast.error('Failed to load lease details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = () => {
    if (!lease?.end_date) return null;
    const end = new Date(lease.end_date);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-gray-100 text-gray-800',
      draft: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      countered: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !leaseId) return;

    setUploadingFile(true);
    try {
      await leaseService.uploadLeaseDocument(leaseId, file, 'lease');
      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      // Reload documents
      const docsData = await leaseService.getLeaseDocuments(leaseId);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      const url = await leaseService.downloadDocument(docId);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Document not available for download');
      }
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handleTerminateLease = async (reason: string) => {
    if (!leaseId) return;

    try {
      await leaseService.terminateLease(leaseId, reason);
      toast.success('Lease terminated successfully');
      setShowTerminateModal(false);
      loadLeaseData();
    } catch (error) {
      toast.error('Failed to terminate lease');
    }
  };

  const handleGenerateRenewal = async () => {
    try {
      toast.loading('Generating renewal offer...');
      await processLeaseRenewals();
      toast.dismiss();
      toast.success('Renewal offer generated');
      // Reload renewal data
      if (leaseId) {
        const renewalData = await getRenewalStatus(leaseId);
        setRenewalOffer(renewalData);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate renewal offer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Lease Not Found</h2>
        <p className="text-gray-500 mb-4">The lease you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/leasing')}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Back to Leasing
        </button>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 60;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FileText },
    { id: 'payments' as TabType, label: 'Payments', icon: CreditCard, count: payments.length },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: documents.length },
    { id: 'renewal' as TabType, label: 'Renewal', icon: RefreshCw }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/leasing')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Lease #{lease.lease_number || lease.id.slice(0, 8)}
                </h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(lease.status)}`}>
                  {lease.status}
                </span>
                {isExpiringSoon && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                    Expires in {daysUntilExpiry} days
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {lease.property?.name} - Unit {lease.unit?.unit_number}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {lease.status === 'active' && (
              <>
                <button
                  onClick={() => setShowTerminateModal(true)}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Terminate</span>
                </button>
                <button
                  onClick={handleGenerateRenewal}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Generate Renewal</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lease Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Monthly Rent</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(lease.monthly_rent)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Security Deposit</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(lease.security_deposit)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Start Date</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatDate(lease.start_date)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">End Date</span>
                  </div>
                  <p className={`text-xl font-bold ${isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                    {formatDate(lease.end_date)}
                  </p>
                </div>
              </div>

              {/* Lease Terms */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Lease Terms</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-500">Lease Type</label>
                      <p className="text-gray-900 font-medium">{lease.lease_type || 'Standard'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Rent Due Day</label>
                      <p className="text-gray-900 font-medium">{lease.rent_due_day || 1}st of each month</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Late Fee</label>
                      <p className="text-gray-900 font-medium">
                        {lease.late_fee_amount ? formatCurrency(lease.late_fee_amount) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Grace Period</label>
                      <p className="text-gray-900 font-medium">{lease.late_fee_grace_days || 5} days</p>
                    </div>
                  </div>
                  {lease.notes && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <label className="text-sm text-gray-500">Notes</label>
                      <p className="text-gray-900 mt-1">{lease.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No payments recorded yet
                    </div>
                  ) : (
                    payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.payment_date)}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tenant Info */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Tenant</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {lease.tenant?.first_name} {lease.tenant?.last_name}
                      </p>
                      <Link
                        to={`/people/${lease.tenant_id}`}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {lease.tenant?.email && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${lease.tenant.email}`} className="text-sm hover:underline">
                          {lease.tenant.email}
                        </a>
                      </div>
                    )}
                    {lease.tenant?.phone && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${lease.tenant.phone}`} className="text-sm hover:underline">
                          {lease.tenant.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2">
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Property Info */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Property</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{lease.property?.name}</p>
                      <Link
                        to={`/properties/${lease.property_id}`}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        View Property
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {lease.property?.address && (
                      <div className="flex items-start space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="text-sm">
                          {lease.property.address}
                          {lease.property.city && `, ${lease.property.city}`}
                          {lease.property.state && `, ${lease.property.state}`}
                          {lease.property.zip_code && ` ${lease.property.zip_code}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Home className="w-4 h-4" />
                      <span className="text-sm">Unit {lease.unit?.unit_number}</span>
                    </div>
                    {lease.unit?.square_feet && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span className="text-sm">
                          {lease.unit.bedrooms} bed, {lease.unit.bathrooms} bath, {lease.unit.square_feet} sq ft
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download Lease</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Edit Lease</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Fee</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No payments recorded yet
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.payment_method || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {payment.late_fee ? formatCurrency(payment.late_fee) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{payment.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Lease Documents</h3>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {documents.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Upload First Document
                  </button>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-sm text-gray-500">
                          {doc.document_type} - {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownloadDocument(doc.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Renewal Tab */}
        {activeTab === 'renewal' && (
          <div className="space-y-6">
            {renewalOffer ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Renewal Offer</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(renewalOffer.status)}`}>
                        {renewalOffer.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Sent: {formatDate(renewalOffer.offer_sent_date)} | Expires: {formatDate(renewalOffer.offer_expiration_date)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Current Rent</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(renewalOffer.current_rent)}</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <p className="text-sm text-teal-600 mb-1">Proposed Rent</p>
                      <p className="text-2xl font-bold text-teal-700">{formatCurrency(renewalOffer.proposed_rent)}</p>
                      <p className="text-sm text-teal-600">+{renewalOffer.rent_increase_percentage.toFixed(1)}% increase</p>
                    </div>
                  </div>

                  {renewalOffer.counter_offer_rent && (
                    <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600 mb-1">Tenant Counter Offer</p>
                      <p className="text-2xl font-bold text-purple-700">{formatCurrency(renewalOffer.counter_offer_rent)}</p>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">New Term Start</p>
                      <p className="font-medium text-gray-900">{formatDate(renewalOffer.proposed_start_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">New Term End</p>
                      <p className="font-medium text-gray-900">{formatDate(renewalOffer.proposed_end_date)}</p>
                    </div>
                  </div>

                  {renewalOffer.status === 'pending' && (
                    <div className="mt-6 pt-6 border-t border-gray-200 flex space-x-3">
                      <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Accept on Behalf
                      </button>
                      <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Send Reminder
                      </button>
                      <button className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                        Cancel Offer
                      </button>
                    </div>
                  )}

                  {renewalOffer.status === 'countered' && (
                    <div className="mt-6 pt-6 border-t border-gray-200 flex space-x-3">
                      <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Accept Counter
                      </button>
                      <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Counter Again
                      </button>
                      <button className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Renewal Offer</h3>
                <p className="text-gray-500 mb-6">
                  {isExpiringSoon
                    ? 'This lease is expiring soon. Generate a renewal offer to retain the tenant.'
                    : 'No renewal offer has been generated for this lease yet.'}
                </p>
                {lease.status === 'active' && (
                  <button
                    onClick={handleGenerateRenewal}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Generate Renewal Offer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop or click to upload</p>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 inline-block"
              >
                {uploadingFile ? 'Uploading...' : 'Select File'}
              </label>
              <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Terminate Lease</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to terminate this lease? This action will mark the unit as vacant.
            </p>
            <textarea
              placeholder="Reason for termination (optional)"
              className="w-full border border-gray-300 rounded-lg p-3 mb-4"
              rows={3}
              id="termination-reason"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = (document.getElementById('termination-reason') as HTMLTextAreaElement)?.value;
                  handleTerminateLease(reason);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Terminate Lease
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
