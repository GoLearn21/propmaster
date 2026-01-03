import { useState, useMemo } from 'react';
import { 
  FileText, 
  Users, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Mail,
  Phone,
  Download,
  Eye,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Calendar,
  UserCheck,
  XCircle,
  ArrowRight
} from 'lucide-react';

import type { Lease } from '../types/lease';

interface SignatureRequest {
  id: string;
  lease_id: string;
  document_id: string;
  document_name: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  status: 'pending' | 'sent' | 'signed' | 'declined' | 'expired';
  requested_at: string;
  sent_at?: string;
  signed_at?: string;
  declined_at?: string;
  expires_at: string;
  signature_method: 'email' | 'sms' | 'both';
  reminder_count: number;
  last_reminder_at?: string;
  signing_url?: string;
  ip_address?: string;
  device_info?: string;
}

interface ESignatureIntegrationProps {
  leases: Lease[];
  propertyId?: string;
}

export default function ESignatureIntegration({ leases, propertyId }: ESignatureIntegrationProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLease, setSelectedLease] = useState<string>('all');
  const [showSendModal, setShowSendModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'templates' | 'settings'>('requests');

  // Mock signature requests data
  const signatureRequests: SignatureRequest[] = useMemo(() => {
    return leases.flatMap(lease => {
      if (!lease.tenant) return [];
      
      const requests: SignatureRequest[] = [
        {
          id: `sig-${lease.id}-1`,
          lease_id: lease.id,
          document_id: `doc-${lease.id}`,
          document_name: 'Lease Agreement',
          tenant_id: lease.tenant.id,
          tenant_name: `${lease.tenant.first_name} ${lease.tenant.last_name}`,
          tenant_email: lease.tenant.email,
          status: Math.random() > 0.5 ? 'pending' : 'signed',
          requested_at: new Date(new Date(lease.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          sent_at: Math.random() > 0.5 ? new Date(new Date(lease.created_at).getTime() + 48 * 60 * 60 * 1000).toISOString() : undefined,
          signed_at: Math.random() > 0.7 ? new Date(new Date(lease.created_at).getTime() + 72 * 60 * 60 * 1000).toISOString() : undefined,
          expires_at: new Date(new Date(lease.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          signature_method: 'email',
          reminder_count: Math.floor(Math.random() * 3),
          last_reminder_at: Math.random() > 0.6 ? new Date().toISOString() : undefined,
          signing_url: `https://sign.example.com/lease/${lease.id}`,
          ip_address: '192.168.1.100',
          device_info: 'Chrome on Windows'
        }
      ];

      // Add random requests for addendums
      if (Math.random() > 0.7) {
        requests.push({
          id: `sig-${lease.id}-2`,
          lease_id: lease.id,
          document_id: `addendum-${lease.id}`,
          document_name: 'Pet Addendum',
          tenant_id: lease.tenant.id,
          tenant_name: `${lease.tenant.first_name} ${lease.tenant.last_name}`,
          tenant_email: lease.tenant.email,
          status: 'pending',
          requested_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          signature_method: 'email',
          reminder_count: 0,
          signing_url: `https://sign.example.com/addendum/${lease.id}`
        });
      }

      return requests;
    });
  }, [leases]);

  const filteredRequests = useMemo(() => {
    return signatureRequests.filter(request => {
      // Status filter
      if (selectedStatus !== 'all' && request.status !== selectedStatus) return false;
      
      // Lease filter
      if (selectedLease !== 'all' && request.lease_id !== selectedLease) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          request.tenant_name.toLowerCase().includes(searchLower) ||
          request.tenant_email.toLowerCase().includes(searchLower) ||
          request.document_name.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [signatureRequests, selectedStatus, selectedLease, searchTerm]);

  const signatureStats = useMemo(() => {
    const totalRequests = signatureRequests.length;
    const pendingRequests = signatureRequests.filter(r => r.status === 'pending').length;
    const signedRequests = signatureRequests.filter(r => r.status === 'signed').length;
    const expiredRequests = signatureRequests.filter(r => r.status === 'expired').length;
    const declinedRequests = signatureRequests.filter(r => r.status === 'declined').length;
    
    const averageSigningTime = signatureRequests
      .filter(r => r.signed_at && r.sent_at)
      .map(r => new Date(r.signed_at!).getTime() - new Date(r.sent_at!).getTime())
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);
    
    return {
      totalRequests,
      pendingRequests,
      signedRequests,
      expiredRequests,
      declinedRequests,
      completionRate: totalRequests > 0 ? (signedRequests / totalRequests) * 100 : 0,
      averageSigningTime: averageSigningTime / (1000 * 60 * 60), // in hours
    };
  }, [signatureRequests]);

  const getStatusColor = (status: SignatureRequest['status']) => {
    switch (status) {
      case 'signed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'sent':
        return 'text-blue-600 bg-blue-100';
      case 'declined':
        return 'text-red-600 bg-red-100';
      case 'expired':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: SignatureRequest['status']) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const handleSendReminder = (request: SignatureRequest) => {
    console.log('Send reminder for:', request.id);
    alert('Reminder sent successfully!');
  };

  const handleResendSignature = (request: SignatureRequest) => {
    console.log('Resend signature for:', request.id);
    alert('Signature request resent!');
  };

  const handleViewDocument = (request: SignatureRequest) => {
    window.open(`/documents/${request.document_id}`, '_blank');
  };

  const sendSignatureRequest = (request: SignatureRequest) => {
    console.log('Send signature request:', request.id);
    alert('Signature request sent via email!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">E-Signature Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage document signatures and track signing progress
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Send for Signature
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'requests', label: 'Signature Requests', count: signatureStats.totalRequests },
            { key: 'templates', label: 'Document Templates', count: 3 },
            { key: 'settings', label: 'Settings', count: null }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.key
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

      {activeTab === 'requests' && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{signatureStats.totalRequests}</p>
                  <p className="text-xs text-gray-500">all time</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{signatureStats.pendingRequests}</p>
                  <p className="text-xs text-gray-500">awaiting signature</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Signed</p>
                  <p className="text-2xl font-bold text-green-900">{signatureStats.signedRequests}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {signatureStats.completionRate.toFixed(1)}% completion
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Signing Time</p>
                  <p className="text-2xl font-bold text-gray-900">{signatureStats.averageSigningTime.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500">completion time</p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by tenant or document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedLease}
                onChange={(e) => setSelectedLease(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Leases</option>
                {leases.map(lease => (
                  <option key={lease.id} value={lease.id}>
                    {lease.lease_number} - {lease.tenant?.first_name} {lease.tenant?.last_name}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="signed">Signed</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Signature Requests Table */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Document</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Tenant</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Requested</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Expires</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => {
                    const lease = leases.find(l => l.id === request.lease_id);
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{request.document_name}</div>
                              <div className="text-xs text-gray-600">{lease?.lease_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.tenant_name}</div>
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {request.tenant_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-900">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            {new Date(request.expires_at).toLocaleDateString()}
                          </div>
                          <div className={`text-xs ${
                            request.status === 'pending' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {formatTimeRemaining(request.expires_at)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-700 capitalize">
                            {request.signature_method}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDocument(request)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              View
                            </button>
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => sendSignatureRequest(request)}
                                  className="text-green-600 hover:text-green-700 text-sm"
                                >
                                  Send
                                </button>
                                <button
                                  onClick={() => handleSendReminder(request)}
                                  className="text-orange-600 hover:text-orange-700 text-sm"
                                >
                                  Remind
                                </button>
                              </>
                            )}
                            {request.signing_url && (
                              <button
                                onClick={() => window.open(request.signing_url, '_blank')}
                                className="text-teal-600 hover:text-teal-700 text-sm"
                              >
                                Signing Link
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <Send className="w-6 h-6 text-blue-500 mb-2" />
                <div className="text-sm font-medium text-gray-900">Send Bulk Reminders</div>
                <div className="text-xs text-gray-600">Remind all pending signers</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <Download className="w-6 h-6 text-green-500 mb-2" />
                <div className="text-sm font-medium text-gray-900">Export Signed Docs</div>
                <div className="text-xs text-gray-600">Download all completed documents</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <RefreshCw className="w-6 h-6 text-purple-500 mb-2" />
                <div className="text-sm font-medium text-gray-900">Refresh Status</div>
                <div className="text-xs text-gray-600">Update signature statuses</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <Plus className="w-6 h-6 text-orange-500 mb-2" />
                <div className="text-sm font-medium text-gray-900">Create Template</div>
                <div className="text-xs text-gray-600">Save current document as template</div>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Document Templates</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Residential Lease Agreement', type: 'Lease', lastUsed: '2 days ago' },
              { name: 'Commercial Lease Agreement', type: 'Lease', lastUsed: '1 week ago' },
              { name: 'Pet Addendum', type: 'Addendum', lastUsed: '3 days ago' },
              { name: 'Rent Increase Notice', type: 'Notice', lastUsed: '5 days ago' },
              { name: 'Move-out Checklist', type: 'Checklist', lastUsed: '1 month ago' },
              { name: 'Maintenance Agreement', type: 'Agreement', lastUsed: '2 weeks ago' }
            ].map((template, index) => (
              <div key={index} className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {template.type}
                  </span>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h4>
                <p className="text-sm text-gray-600 mb-4">Last used {template.lastUsed}</p>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700">
                    Use Template
                  </button>
                  <button className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">E-Signature Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Expiration (days)
                </label>
                <input
                  type="number"
                  defaultValue={14}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Method
                </label>
                <select className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both Email & SMS</option>
                </select>
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm text-gray-700">Send automatic reminders</span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm text-gray-700">Require IP logging</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}