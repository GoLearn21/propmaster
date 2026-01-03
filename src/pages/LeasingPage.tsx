/**
 * Leasing Page
 * Comprehensive lease management with applications, leases, documents, and renewals
 * Features inspired by: DoorLoop, Rentvine, Buildium
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  File,
  RefreshCw,
  Search,
  Plus,
  Building,
  Calendar,
  DollarSign,
  Upload,
  Download,
  Eye,
  AlertCircle,
  ArrowRight,
  MoreVertical,
  Send,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { documentsService, Document } from '../services/documentsService';
import { processLeaseRenewals, LeaseRenewalOffer } from '../services/leaseRenewalService';
import { leaseService } from '../services/leaseService';
import toast from 'react-hot-toast';

type TabType = 'applications' | 'leases' | 'documents' | 'renewals';

interface Lease {
  id: string;
  lease_number: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  properties?: { name: string };
  units?: { unit_number: string };
  tenants?: { first_name: string; last_name: string; email: string };
}

interface Renewal extends LeaseRenewalOffer {
  lease?: Lease;
  tenant?: { first_name: string; last_name: string };
  property?: { name: string };
  unit?: { unit_number: string };
}

export default function LeasingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('applications');
  const [applications, setApplications] = useState<any[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingRenewals, setGeneratingRenewals] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [expiringLeases, setExpiringLeases] = useState<Lease[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'applications':
          await loadApplications();
          break;
        case 'leases':
          await loadLeases();
          break;
        case 'documents':
          await loadDocuments();
          break;
        case 'renewals':
          await loadRenewals();
          await loadExpiringLeases();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    let query = supabase
      .from('applications')
      .select('*, properties(name), units(unit_number)')
      .order('application_date', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) throw error;
    setApplications(data || []);
  };

  const loadLeases = async () => {
    let query = supabase
      .from('leases')
      .select(`
        *,
        properties:property_id(name),
        units:unit_id(unit_number),
        tenants:tenant_id(first_name, last_name, email)
      `)
      .order('start_date', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) throw error;
    setLeases((data || []) as Lease[]);
  };

  const loadDocuments = async () => {
    try {
      const docs = await documentsService.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const loadRenewals = async () => {
    const { data, error } = await supabase
      .from('lease_renewal_offers')
      .select(`
        *,
        lease:leases(*),
        tenant:tenants(first_name, last_name),
        property:properties(name),
        unit:units(unit_number)
      `)
      .order('offer_sent_date', { ascending: false });

    if (error) {
      console.error('Error loading renewals:', error);
      setRenewals([]);
      return;
    }

    setRenewals((data || []) as Renewal[]);
  };

  const loadExpiringLeases = async () => {
    try {
      const expiring = await leaseService.getExpiringLeases(60);
      setExpiringLeases(expiring);
    } catch (error) {
      console.error('Error loading expiring leases:', error);
      setExpiringLeases([]);
    }
  };

  // Action handlers
  const handleViewLease = (leaseId: string) => {
    navigate(`/leases/${leaseId}`);
  };

  const handleDownloadLease = async (leaseId: string) => {
    try {
      // Get lease documents
      const docs = await leaseService.getLeaseDocuments(leaseId);
      if (docs.length > 0) {
        const url = await leaseService.downloadDocument(docs[0].id);
        if (url) {
          window.open(url, '_blank');
        } else {
          toast.error('No downloadable document found');
        }
      } else {
        toast.error('No documents attached to this lease');
      }
    } catch (error) {
      toast.error('Failed to download lease');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      if (selectedLeaseId) {
        await leaseService.uploadLeaseDocument(selectedLeaseId, file, 'lease');
      } else {
        // Upload general document
        const fileName = `general/${Date.now()}-${file.name}`;
        await supabase.storage.from('documents').upload(fileName, file);

        // Create document record
        await supabase.from('documents').insert({
          file_name: file.name,
          file_url: fileName,
          document_type: 'general',
          created_at: new Date().toISOString()
        });
      }

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedLeaseId(null);
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGenerateRenewals = async () => {
    setGeneratingRenewals(true);
    try {
      const result = await processLeaseRenewals();

      if (result.offers_generated > 0) {
        toast.success(`Generated ${result.offers_generated} renewal offer(s)`);
      } else if (result.leases_expiring === 0) {
        toast.success('No leases expiring in the next 60-70 days');
      } else {
        toast.success('Renewal offers already exist for expiring leases');
      }

      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.error(err));
      }

      setShowRenewalModal(false);
      loadRenewals();
    } catch (error) {
      console.error('Error generating renewals:', error);
      toast.error('Failed to generate renewal offers');
    } finally {
      setGeneratingRenewals(false);
    }
  };

  const handleViewDocument = (docId: string) => {
    // Navigate to document viewer or open in new tab
    toast.success('Opening document...');
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

  const handleManageRenewal = (renewalId: string) => {
    // Find the lease associated with this renewal
    const renewal = renewals.find(r => r.id === renewalId);
    if (renewal?.lease_id) {
      navigate(`/leases/${renewal.lease_id}?tab=renewal`);
    }
  };

  // Stats calculations
  const applicationStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const leaseStats = {
    total: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    expiring: leases.filter(l => {
      const endDate = new Date(l.end_date);
      const now = new Date();
      const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return l.status === 'active' && daysUntilEnd <= 60 && daysUntilEnd > 0;
    }).length,
    expired: leases.filter(l => l.status === 'expired').length,
  };

  const documentStats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'sent' || d.status === 'partially-signed').length,
    completed: documents.filter(d => d.status === 'completed').length,
    draft: documents.filter(d => d.status === 'draft').length,
  };

  const renewalStats = {
    total: renewals.length,
    pending: renewals.filter(r => r.status === 'pending').length,
    accepted: renewals.filter(r => r.status === 'accepted').length,
    declined: renewals.filter(r => r.status === 'declined').length,
    countered: renewals.filter(r => r.status === 'countered').length,
  };

  // Filtering data based on search
  const filteredApplications = applications.filter(app =>
    `${app.applicant_first_name} ${app.applicant_last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeases = leases.filter(lease =>
    `${lease.tenants?.first_name} ${lease.tenants?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lease.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lease.lease_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRenewals = renewals.filter(renewal =>
    `${renewal.tenant?.first_name} ${renewal.tenant?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    renewal.property?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'applications' as TabType, label: 'Applications', icon: Users, count: applicationStats.total },
    { id: 'leases' as TabType, label: 'Leases', icon: FileText, count: leaseStats.total },
    { id: 'documents' as TabType, label: 'Documents', icon: File, count: documentStats.total },
    { id: 'renewals' as TabType, label: 'Renewals', icon: RefreshCw, count: renewalStats.total },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      'partially-signed': 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      countered: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Leasing</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage applications, leases, documents, and renewals
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm w-64"
              />
            </div>
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/leasing/create')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Lease</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <nav className="flex space-x-1" aria-label="Tabs">
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
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        {activeTab === 'applications' && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <StatCard icon={FileText} label="Total Applications" value={applicationStats.total} color="gray" />
            <StatCard icon={Clock} label="Pending Review" value={applicationStats.pending} color="yellow" />
            <StatCard icon={CheckCircle} label="Approved" value={applicationStats.approved} color="green" />
            <StatCard icon={XCircle} label="Rejected" value={applicationStats.rejected} color="red" />
          </div>
        )}

        {activeTab === 'leases' && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <StatCard icon={FileText} label="Total Leases" value={leaseStats.total} color="gray" />
            <StatCard icon={CheckCircle} label="Active" value={leaseStats.active} color="green" />
            <StatCard icon={AlertCircle} label="Expiring Soon" value={leaseStats.expiring} color="orange" />
            <StatCard icon={XCircle} label="Expired" value={leaseStats.expired} color="red" />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <StatCard icon={File} label="Total Documents" value={documentStats.total} color="gray" />
            <StatCard icon={Clock} label="Awaiting Signature" value={documentStats.pending} color="yellow" />
            <StatCard icon={CheckCircle} label="Completed" value={documentStats.completed} color="green" />
            <StatCard icon={FileText} label="Drafts" value={documentStats.draft} color="gray" />
          </div>
        )}

        {activeTab === 'renewals' && (
          <div className="grid grid-cols-5 gap-6 mb-6">
            <StatCard icon={RefreshCw} label="Total Renewals" value={renewalStats.total} color="gray" />
            <StatCard icon={Clock} label="Pending" value={renewalStats.pending} color="yellow" />
            <StatCard icon={CheckCircle} label="Accepted" value={renewalStats.accepted} color="green" />
            <StatCard icon={XCircle} label="Declined" value={renewalStats.declined} color="red" />
            <StatCard icon={ArrowRight} label="Countered" value={renewalStats.countered} color="purple" />
          </div>
        )}

        {/* Filter Tabs for Applications */}
        {activeTab === 'applications' && (
          <div className="flex space-x-4 mb-6">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Filter Tabs for Leases */}
        {activeTab === 'leases' && (
          <div className="flex space-x-4 mb-6">
            {['all', 'active', 'expired', 'pending'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Content Tables */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Applications Table */}
          {activeTab === 'applications' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Income</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No applications found
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {app.applicant_first_name} {app.applicant_last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.properties?.name} - {app.units?.unit_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{app.applicant_email}</div>
                        <div className="text-xs text-gray-500">{app.applicant_phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(app.application_date)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(app.income_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toast.success('Application details coming soon')}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Leases Table */}
          {activeTab === 'leases' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lease #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No leases found
                    </td>
                  </tr>
                ) : (
                  filteredLeases.map((lease) => {
                    const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
                    const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 60;

                    return (
                      <tr key={lease.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-teal-600">
                          <button
                            onClick={() => handleViewLease(lease.id)}
                            className="hover:underline"
                          >
                            {lease.lease_number || lease.id.slice(0, 8)}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => navigate(`/people/${lease.tenant_id}`)}
                            className="text-teal-600 hover:underline"
                          >
                            {lease.tenants?.first_name} {lease.tenants?.last_name}
                          </button>
                          <div className="text-xs text-gray-500">{lease.tenants?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span>{lease.properties?.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">Unit {lease.units?.unit_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(lease.start_date)} - {formatDate(lease.end_date)}</span>
                          </div>
                          {isExpiringSoon && (
                            <div className="text-xs text-orange-600 mt-1">
                              Expires in {daysUntilExpiry} days
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{formatCurrency(lease.monthly_rent)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lease.status)}`}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewLease(lease.id)}
                              className="text-teal-600 hover:text-teal-700 p-1 rounded hover:bg-gray-100"
                              title="View Lease"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadLease(lease.id)}
                              className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Documents Table */}
          {activeTab === 'documents' && (
            <div>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900">Lease Documents</h3>
                <button
                  onClick={() => {
                    setSelectedLeaseId(null);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property/Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No documents found
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <File className="w-8 h-8 text-teal-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{doc.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{doc.property}</div>
                          <div className="text-xs text-gray-500">Unit {doc.unit}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {doc.recipients.map((r, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <span>{r.name}</span>
                              {r.signed ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(doc.createdDate)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewDocument(doc.id)}
                              className="text-teal-600 hover:text-teal-700 p-1 rounded hover:bg-gray-100"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc.id)}
                              className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Renewals Table */}
          {activeTab === 'renewals' && (
            <div>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Lease Renewal Offers</h3>
                  {expiringLeases.length > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {expiringLeases.length} lease(s) expiring in the next 60 days
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowRenewalModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Renewal Offers</span>
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property/Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proposed Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Increase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRenewals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        No renewal offers found. Click "Generate Renewal Offers" to create offers for expiring leases.
                      </td>
                    </tr>
                  ) : (
                    filteredRenewals.map((renewal) => (
                      <tr key={renewal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {renewal.tenant?.first_name} {renewal.tenant?.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{renewal.property?.name}</div>
                          <div className="text-xs text-gray-500">Unit {renewal.unit?.unit_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(renewal.current_rent)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {formatCurrency(renewal.proposed_rent)}
                          {renewal.counter_offer_rent && (
                            <div className="text-xs text-purple-600">
                              Counter: {formatCurrency(renewal.counter_offer_rent)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${renewal.rent_increase_percentage > 5 ? 'text-red-600' : 'text-green-600'}`}>
                            +{renewal.rent_increase_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(renewal.proposed_start_date)} - {formatDate(renewal.proposed_end_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(renewal.offer_expiration_date)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(renewal.status)}`}>
                            {renewal.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleManageRenewal(renewal.id)}
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
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
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedLeaseId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Renewals Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Renewal Offers</h3>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will automatically generate renewal offers for all leases expiring in the next 60-70 days.
              </p>

              {expiringLeases.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 text-orange-700 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{expiringLeases.length} Leases Expiring Soon</span>
                  </div>
                  <ul className="text-sm text-orange-600 space-y-1 max-h-32 overflow-y-auto">
                    {expiringLeases.slice(0, 5).map(lease => (
                      <li key={lease.id}>
                        {lease.tenant?.first_name} {lease.tenant?.last_name} - {lease.property?.name}
                        (expires {formatDate(lease.end_date)})
                      </li>
                    ))}
                    {expiringLeases.length > 5 && (
                      <li className="text-gray-500">...and {expiringLeases.length - 5} more</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>No leases expiring in the next 60 days</span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Renewal Settings</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Rent increase: 3-5% based on market conditions</li>
                  <li>- New term: 12 months</li>
                  <li>- Response deadline: 30 days before lease ends</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRenewals}
                disabled={generatingRenewals}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {generatingRenewals ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate Offers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'orange' | 'purple'
}) {
  const colors = {
    gray: 'text-gray-400',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };

  const valueColors = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${valueColors[color]}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${colors[color]}`} />
      </div>
    </div>
  );
}
