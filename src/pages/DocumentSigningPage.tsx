import React, { useState, useEffect } from 'react';
import { documentsService, type Document as DocumentType } from '../services/documentsService';
import { 
  FileText, 
  Plus, 
  Search,
  CheckCircle,
  Clock,
  Send,
  Download,
  Eye,
  Edit,
  Trash2,
  Users,
  AlertCircle
} from 'lucide-react';

type Document = DocumentType;

const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'Residential Lease Agreement - Unit 101',
    type: 'lease',
    status: 'completed',
    property: 'Sunset Apartments',
    unit: 'Unit 101',
    recipients: [
      {
        name: 'Emily Rodriguez',
        email: 'emily.r@email.com',
        role: 'tenant',
        signed: true,
        signedDate: '2025-11-03'
      },
      {
        name: 'Property Manager',
        email: 'pm@propmaster.com',
        role: 'landlord',
        signed: true,
        signedDate: '2025-11-03'
      }
    ],
    createdDate: '2025-11-01',
    sentDate: '2025-11-01',
    completedDate: '2025-11-03'
  },
  {
    id: '2',
    title: 'Lease Renewal Agreement - Unit 202',
    type: 'lease',
    status: 'partially-signed',
    property: 'Riverside Complex',
    unit: 'Unit 202',
    recipients: [
      {
        name: 'Michael Chen',
        email: 'mchen@email.com',
        role: 'tenant',
        signed: true,
        signedDate: '2025-11-04'
      },
      {
        name: 'Property Manager',
        email: 'pm@propmaster.com',
        role: 'landlord',
        signed: false
      }
    ],
    createdDate: '2025-11-02',
    sentDate: '2025-11-03'
  },
  {
    id: '3',
    title: 'Pet Addendum - Unit 305',
    type: 'addendum',
    status: 'sent',
    property: 'Downtown Lofts',
    unit: 'Unit 305',
    recipients: [
      {
        name: 'David Park',
        email: 'dpark@email.com',
        role: 'tenant',
        signed: false
      }
    ],
    createdDate: '2025-11-04',
    sentDate: '2025-11-04',
    expiryDate: '2025-11-11'
  },
  {
    id: '4',
    title: 'Move-In Inspection Report - Unit 104',
    type: 'disclosure',
    status: 'draft',
    property: 'Riverside Complex',
    unit: 'Unit 104',
    recipients: [
      {
        name: 'Jennifer Lee',
        email: 'jlee@email.com',
        role: 'tenant',
        signed: false
      }
    ],
    createdDate: '2025-11-05'
  },
  {
    id: '5',
    title: 'Lease Termination Agreement - Unit 203',
    type: 'agreement',
    status: 'completed',
    property: 'Sunset Apartments',
    unit: 'Unit 203',
    recipients: [
      {
        name: 'Robert Martinez',
        email: 'rmartinez@email.com',
        role: 'tenant',
        signed: true,
        signedDate: '2025-10-28'
      },
      {
        name: 'Property Manager',
        email: 'pm@propmaster.com',
        role: 'landlord',
        signed: true,
        signedDate: '2025-10-28'
      }
    ],
    createdDate: '2025-10-25',
    sentDate: '2025-10-26',
    completedDate: '2025-10-28'
  }
];

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  'partially-signed': { label: 'Partially Signed', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

const TYPE_LABELS = {
  lease: 'Lease',
  addendum: 'Addendum',
  notice: 'Notice',
  agreement: 'Agreement',
  disclosure: 'Disclosure'
};

export default function DocumentSigningPage() {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [loading, setLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = await documentsService.getDocuments();
        if (data && data.length > 0) {
          setDocuments(data);
        }
      } catch (error) {
        console.error('Failed to load documents, using fallback data:', error);
        // Keep fallback data on error
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Calculate metrics
  const metrics = {
    totalDocs: documents.length,
    draft: documents.filter(d => d.status === 'draft').length,
    sent: documents.filter(d => d.status === 'sent').length,
    partiallySigned: documents.filter(d => d.status === 'partially-signed').length,
    completed: documents.filter(d => d.status === 'completed').length,
    completionRate: documents.length > 0
      ? ((documents.filter(d => d.status === 'completed').length / documents.length) * 100).toFixed(0)
      : '0'
  };

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.unit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getSignatureProgress = (doc: Document) => {
    const total = doc.recipients.length;
    const signed = doc.recipients.filter(r => r.signed).length;
    return { signed, total, percentage: (signed / total) * 100 };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-darker">Document Signing</h1>
          <p className="text-neutral-medium mt-1">E-signature workflows and document management</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-5 h-5" />
          Create Document
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Total Documents</p>
              <p className="text-3xl font-bold text-neutral-darker mt-1">{metrics.totalDocs}</p>
            </div>
            <FileText className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Draft</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{metrics.draft}</p>
            </div>
            <Edit className="w-10 h-10 text-gray-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Sent</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.sent}</p>
            </div>
            <Send className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Partially Signed</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{metrics.partiallySigned}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.completed}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.completionRate}%</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-light">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium w-5 h-5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="lease">Lease</option>
            <option value="addendum">Addendum</option>
            <option value="notice">Notice</option>
            <option value="agreement">Agreement</option>
            <option value="disclosure">Disclosure</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partially-signed">Partially Signed</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-lighter border-b border-neutral-light">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Document</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Property</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Signatures</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Recipients</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Dates</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {filteredDocs.map((doc) => {
              const statusConfig = STATUS_CONFIG[doc.status];
              const StatusIcon = statusConfig.icon;
              const progress = getSignatureProgress(doc);
              
              return (
                <tr key={doc.id} className="hover:bg-neutral-lighter transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-darker">{doc.title}</div>
                        <div className="text-sm text-neutral-medium">Created {doc.createdDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-neutral-lighter text-neutral-darker">
                      {TYPE_LABELS[doc.type]}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-neutral-darker">{doc.property}</div>
                    <div className="text-sm text-neutral-medium">{doc.unit}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-lighter rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-green-500 h-full transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-neutral-medium">
                        {progress.signed} of {progress.total} signed
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1">
                      {doc.recipients.map((recipient, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {recipient.signed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-neutral-dark">{recipient.name}</span>
                          <span className="text-xs text-neutral-medium">({recipient.role})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {doc.sentDate && (
                        <div className="text-neutral-medium">
                          Sent: {doc.sentDate}
                        </div>
                      )}
                      {doc.completedDate && (
                        <div className="text-green-600">
                          Completed: {doc.completedDate}
                        </div>
                      )}
                      {doc.expiryDate && !doc.completedDate && (
                        <div className="text-orange-600">
                          Expires: {doc.expiryDate}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-neutral-medium" />
                      </button>
                      <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-neutral-medium" />
                      </button>
                      {doc.status === 'draft' && (
                        <>
                          <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-neutral-medium" />
                          </button>
                          <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDocs.length === 0 && (
          <div className="py-12 text-center text-neutral-medium">
            No documents found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
