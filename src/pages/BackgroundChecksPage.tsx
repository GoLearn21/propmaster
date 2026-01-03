import React, { useState, useEffect } from 'react';
import { backgroundChecksService, type BackgroundCheck as BackgroundCheckType } from '../services/backgroundChecksService';
import { 
  Shield, 
  Plus, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  FileText,
  DollarSign,
  Download,
  Eye
} from 'lucide-react';

type BackgroundCheck = BackgroundCheckType;

const MOCK_CHECKS: BackgroundCheck[] = [
  {
    id: '1',
    applicantName: 'Emily Rodriguez',
    applicantEmail: 'emily.r@email.com',
    propertyName: 'Sunset Apartments',
    unitNumber: 'Unit 101',
    status: 'completed',
    creditScore: 740,
    criminalRecord: 'clear',
    evictionHistory: 'none',
    employmentVerified: true,
    incomeVerified: true,
    requestedDate: '2025-11-01',
    completedDate: '2025-11-03',
    cost: 45.00,
    recommendation: 'approve'
  },
  {
    id: '2',
    applicantName: 'Michael Chen',
    applicantEmail: 'mchen@email.com',
    propertyName: 'Riverside Complex',
    unitNumber: 'Unit 202',
    status: 'in-progress',
    creditScore: 680,
    criminalRecord: 'pending',
    evictionHistory: 'pending',
    employmentVerified: true,
    incomeVerified: null,
    requestedDate: '2025-11-04',
    completedDate: null,
    cost: 45.00,
    recommendation: 'pending'
  },
  {
    id: '3',
    applicantName: 'David Park',
    applicantEmail: 'dpark@email.com',
    propertyName: 'Downtown Lofts',
    unitNumber: 'Unit 305',
    status: 'completed',
    creditScore: 620,
    criminalRecord: 'minor',
    evictionHistory: 'resolved',
    employmentVerified: true,
    incomeVerified: true,
    requestedDate: '2025-10-28',
    completedDate: '2025-10-30',
    cost: 45.00,
    recommendation: 'approve-conditional'
  },
  {
    id: '4',
    applicantName: 'Jennifer Lee',
    applicantEmail: 'jlee@email.com',
    propertyName: 'Riverside Complex',
    unitNumber: 'Unit 104',
    status: 'flagged',
    creditScore: 550,
    criminalRecord: 'major',
    evictionHistory: 'active',
    employmentVerified: false,
    incomeVerified: false,
    requestedDate: '2025-11-02',
    completedDate: '2025-11-04',
    cost: 45.00,
    recommendation: 'deny'
  },
  {
    id: '5',
    applicantName: 'Robert Martinez',
    applicantEmail: 'rmartinez@email.com',
    propertyName: 'Sunset Apartments',
    unitNumber: 'Unit 203',
    status: 'pending',
    creditScore: null,
    criminalRecord: 'pending',
    evictionHistory: 'pending',
    employmentVerified: null,
    incomeVerified: null,
    requestedDate: '2025-11-05',
    completedDate: null,
    cost: 45.00,
    recommendation: 'pending'
  }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  flagged: { label: 'Flagged', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

const RECOMMENDATION_CONFIG = {
  approve: { label: 'Approve', color: 'bg-green-100 text-green-700 border-green-300' },
  'approve-conditional': { label: 'Approve (Conditional)', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  deny: { label: 'Deny', color: 'bg-red-100 text-red-700 border-red-300' },
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700 border-gray-300' }
};

export default function BackgroundChecksPage() {
  const [checks, setChecks] = useState<BackgroundCheck[]>(MOCK_CHECKS);
  const [loading, setLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    const loadChecks = async () => {
      try {
        const data = await backgroundChecksService.getBackgroundChecks();
        if (data && data.length > 0) {
          setChecks(data);
        }
      } catch (error) {
        console.error('Failed to load background checks, using fallback data:', error);
        // Keep fallback data on error
      } finally {
        setLoading(false);
      }
    };
    loadChecks();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Calculate metrics
  const metrics = {
    totalChecks: checks.length,
    pending: checks.filter(c => c.status === 'pending').length,
    inProgress: checks.filter(c => c.status === 'in-progress').length,
    completed: checks.filter(c => c.status === 'completed').length,
    flagged: checks.filter(c => c.status === 'flagged').length,
    approvalRate: checks.filter(c => c.status === 'completed').length > 0
      ? ((checks.filter(c => c.recommendation === 'approve').length / checks.filter(c => c.status === 'completed').length) * 100).toFixed(0)
      : '0'
  };

  // Filter checks
  const filteredChecks = checks.filter(check => {
    const matchesSearch = check.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || check.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getCreditScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 700) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecordBadge = (record: string) => {
    const config = {
      clear: { label: 'Clear', color: 'bg-green-100 text-green-700' },
      minor: { label: 'Minor Issues', color: 'bg-yellow-100 text-yellow-700' },
      major: { label: 'Major Issues', color: 'bg-red-100 text-red-700' },
      pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
      none: { label: 'None', color: 'bg-green-100 text-green-700' },
      resolved: { label: 'Resolved', color: 'bg-yellow-100 text-yellow-700' },
      active: { label: 'Active', color: 'bg-red-100 text-red-700' }
    };
    return config[record as keyof typeof config] || config.pending;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-darker">Background Checks</h1>
          <p className="text-neutral-medium mt-1">Automated tenant screening and verification</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-5 h-5" />
          New Background Check
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Total Checks</p>
              <p className="text-3xl font-bold text-neutral-darker mt-1">{metrics.totalChecks}</p>
            </div>
            <Shield className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{metrics.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-gray-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.inProgress}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500 opacity-20" />
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
              <p className="text-sm text-neutral-medium">Flagged</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics.flagged}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Approval Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.approvalRate}%</p>
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
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Checks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-lighter border-b border-neutral-light">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Applicant</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Property</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Credit Score</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Criminal</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Eviction</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Verified</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Recommendation</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {filteredChecks.map((check) => {
              const statusConfig = STATUS_CONFIG[check.status];
              const StatusIcon = statusConfig.icon;
              const criminalBadge = getRecordBadge(check.criminalRecord);
              const evictionBadge = getRecordBadge(check.evictionHistory);
              const recConfig = RECOMMENDATION_CONFIG[check.recommendation];
              
              return (
                <tr key={check.id} className="hover:bg-neutral-lighter transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-darker">{check.applicantName}</div>
                        <div className="text-sm text-neutral-medium">{check.applicantEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-neutral-darker">{check.propertyName}</div>
                    <div className="text-sm text-neutral-medium">{check.unitNumber}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className={`text-lg font-bold ${getCreditScoreColor(check.creditScore)}`}>
                      {check.creditScore || '—'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${criminalBadge.color}`}>
                      {criminalBadge.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${evictionBadge.color}`}>
                      {evictionBadge.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs">
                        {check.employmentVerified === true && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {check.employmentVerified === false && <XCircle className="w-3 h-3 text-red-600" />}
                        {check.employmentVerified === null && <Clock className="w-3 h-3 text-gray-400" />}
                        <span className="text-neutral-medium">Employment</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {check.incomeVerified === true && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {check.incomeVerified === false && <XCircle className="w-3 h-3 text-red-600" />}
                        {check.incomeVerified === null && <Clock className="w-3 h-3 text-gray-400" />}
                        <span className="text-neutral-medium">Income</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium border ${recConfig.color}`}>
                      {recConfig.label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-neutral-medium" />
                      </button>
                      <button className="p-2 hover:bg-neutral-lighter rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-neutral-medium" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredChecks.length === 0 && (
          <div className="py-12 text-center text-neutral-medium">
            No background checks found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
