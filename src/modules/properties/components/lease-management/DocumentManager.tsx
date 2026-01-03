import { useState, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Share, 
  Search, 
  Filter,
  Plus,
  Calendar,
  User,
  Home,
  AlertCircle,
  CheckCircle,
  Clock,
  Link,
  FileImage,
  File
} from 'lucide-react';

import type { Lease } from '../types/lease';

interface Document {
  id: string;
  lease_id: string;
  name: string;
  type: 'lease_agreement' | 'addendum' | 'notice' | 'payment_receipt' | 'inspection_report' | 'maintenance_request' | 'other';
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
  tags: string[];
  description?: string;
  expiration_date?: string;
}

interface DocumentManagerProps {
  leases: Lease[];
  propertyId?: string;
}

export default function DocumentManager({ leases, propertyId }: DocumentManagerProps) {
  const [selectedLease, setSelectedLease] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock documents data - in real app, this would come from API
  const documents: Document[] = useMemo(() => {
    return leases.flatMap(lease => {
      const docs: Document[] = [
        {
          id: `lease-agreement-${lease.id}`,
          lease_id: lease.id,
          name: `Lease Agreement - ${lease.lease_number}`,
          type: 'lease_agreement',
          file_url: `/documents/lease-${lease.id}.pdf`,
          file_size: 1024 * 500, // 500KB
          mime_type: 'application/pdf',
          uploaded_by: 'System',
          uploaded_at: lease.created_at,
          updated_at: lease.updated_at,
          status: 'signed',
          tags: ['lease', 'agreement', 'signed'],
          description: 'Original lease agreement document'
        },
        {
          id: `addendum-${lease.id}`,
          lease_id: lease.id,
          name: `Pet Addendum`,
          type: 'addendum',
          file_url: `/documents/addendum-${lease.id}.pdf`,
          file_size: 1024 * 200, // 200KB
          mime_type: 'application/pdf',
          uploaded_by: 'Property Manager',
          uploaded_at: new Date(new Date(lease.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(new Date(lease.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'signed',
          tags: ['addendum', 'pet', 'amendment'],
          description: 'Pet policy addendum'
        }
      ];

      // Add some random documents for variety
      if (Math.random() > 0.5) {
        docs.push({
          id: `notice-${lease.id}`,
          lease_id: lease.id,
          name: 'Rent Increase Notice',
          type: 'notice',
          file_url: `/documents/notice-${lease.id}.pdf`,
          file_size: 1024 * 150,
          mime_type: 'application/pdf',
          uploaded_by: 'Property Manager',
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'pending_signature',
          tags: ['notice', 'rent'],
          description: 'Notice of rent increase effective next month'
        });
      }

      return docs;
    });
  }, [leases]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Lease filter
      if (selectedLease !== 'all' && doc.lease_id !== selectedLease) return false;
      
      // Type filter
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      
      // Status filter
      if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          doc.name.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [documents, selectedLease, selectedType, selectedStatus, searchTerm]);

  const documentStats = useMemo(() => {
    const totalDocuments = documents.length;
    const pendingSignature = documents.filter(d => d.status === 'pending_signature').length;
    const signedDocuments = documents.filter(d => d.status === 'signed').length;
    const totalFileSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    
    return {
      totalDocuments,
      pendingSignature,
      signedDocuments,
      totalFileSize,
      averageFileSize: totalDocuments > 0 ? totalFileSize / totalDocuments : 0
    };
  }, [documents]);

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-8 h-8 text-blue-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'signed':
        return 'text-green-600 bg-green-100';
      case 'pending_signature':
        return 'text-yellow-600 bg-yellow-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_signature':
        return <Clock className="w-4 h-4" />;
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'lease_agreement':
        return <FileText className="w-4 h-4" />;
      case 'addendum':
        return <FileText className="w-4 h-4" />;
      case 'notice':
        return <AlertCircle className="w-4 h-4" />;
      case 'payment_receipt':
        return <FileText className="w-4 h-4" />;
      case 'inspection_report':
        return <FileText className="w-4 h-4" />;
      case 'maintenance_request':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDocumentAction = (action: string, document: Document) => {
    switch (action) {
      case 'view':
        // Open document viewer
        window.open(document.file_url, '_blank');
        break;
      case 'download':
        // Download document
        const a = document.createElement('a');
        a.href = document.file_url;
        a.download = document.name;
        a.click();
        break;
      case 'share':
        // Share document
        navigator.clipboard.writeText(document.file_url);
        alert('Document link copied to clipboard');
        break;
      case 'delete':
        // Delete document
        if (confirm('Are you sure you want to delete this document?')) {
          console.log('Delete document:', document.id);
        }
        break;
      default:
        break;
    }
  };

  const requestSignatures = (document: Document) => {
    console.log('Request signatures for:', document.id);
    // In real app, this would integrate with e-signature service
    alert('Signature request sent to tenant');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage lease documents, addendums, and notices
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documentStats.totalDocuments}</p>
              <p className="text-xs text-gray-500">{formatFileSize(documentStats.totalFileSize)}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Signatures</p>
              <p className="text-2xl font-bold text-yellow-900">{documentStats.pendingSignature}</p>
              <p className="text-xs text-gray-500">requiring action</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Signed Documents</p>
              <p className="text-2xl font-bold text-green-900">{documentStats.signedDocuments}</p>
              <p className="text-xs text-gray-500">executed</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average File Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(documentStats.averageFileSize)}</p>
              <p className="text-xs text-gray-500">per document</p>
            </div>
            <File className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="lease_agreement">Lease Agreement</option>
            <option value="addendum">Addendum</option>
            <option value="notice">Notice</option>
            <option value="payment_receipt">Payment Receipt</option>
            <option value="inspection_report">Inspection Report</option>
            <option value="maintenance_request">Maintenance Request</option>
            <option value="other">Other</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_signature">Pending Signature</option>
            <option value="signed">Signed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((document) => {
            const lease = leases.find(l => l.id === document.lease_id);
            return (
              <div key={document.id} className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    {getDocumentIcon(document.mime_type)}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                      {getStatusIcon(document.status)}
                      {document.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                    {document.name}
                  </h3>
                  
                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      {getTypeIcon(document.type)}
                      <span className="capitalize">{document.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      {lease?.property?.name} - {lease?.unit?.unit_number}
                    </div>
                    {lease?.tenant && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {lease.tenant.first_name} {lease.tenant.last_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(document.updated_at).toLocaleDateString()}
                    </div>
                    <div>
                      {formatFileSize(document.file_size)}
                    </div>
                  </div>

                  {document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {document.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {document.description && (
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                      {document.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDocumentAction('view', document)}
                      className="flex-1 px-3 py-2 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDocumentAction('download', document)}
                      className="px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDocumentAction('share', document)}
                      className="px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      <Share className="w-3 h-3" />
                    </button>
                    {document.status === 'pending_signature' && (
                      <button
                        onClick={() => requestSignatures(document)}
                        className="px-3 py-2 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                      >
                        <Link className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Document</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Lease</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Updated</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Size</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocuments.map((document) => {
                  const lease = leases.find(l => l.id === document.lease_id);
                  return (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {getDocumentIcon(document.mime_type)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{document.name}</div>
                            {document.description && (
                              <div className="text-xs text-gray-600">{document.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {lease?.lease_number}
                        </div>
                        <div className="text-xs text-gray-600">
                          {lease?.tenant?.first_name} {lease?.tenant?.last_name}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700 capitalize">
                          {getTypeIcon(document.type)}
                          {document.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          {document.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900">
                        {new Date(document.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900">
                        {formatFileSize(document.file_size)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDocumentAction('view', document)}
                            className="text-teal-600 hover:text-teal-700 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDocumentAction('download', document)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Download
                          </button>
                          {document.status === 'pending_signature' && (
                            <button
                              onClick={() => requestSignatures(document)}
                              className="text-purple-600 hover:text-purple-700 text-sm"
                            >
                              Send Signature
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
      )}

      {/* Bulk Actions */}
      {filteredDocuments.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div className="flex gap-4">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Download All
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Request Signatures
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Archive Selected
            </button>
            <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
              Delete Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}