import React, { useState, useMemo, useEffect } from 'react';
import { leadsService, type Lead as LeadType } from '../services/leadsService';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Star,
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

type Lead = LeadType;

const MOCK_LEADS_FALLBACK: Lead[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 123-4567',
    source: 'zillow',
    status: 'qualified',
    score: 85,
    propertyInterest: 'Downtown Lofts - Unit 305',
    budget: 2500,
    moveInDate: '2025-12-01',
    lastContact: '2025-11-04',
    notes: 'Interested in 2BR, prefers high floor',
    createdAt: '2025-10-28'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'mchen@email.com',
    phone: '(555) 234-5678',
    source: 'website',
    status: 'touring',
    score: 92,
    propertyInterest: 'Riverside Complex - Unit 202',
    budget: 3000,
    moveInDate: '2025-11-15',
    lastContact: '2025-11-05',
    notes: 'Scheduled tour for tomorrow',
    createdAt: '2025-10-30'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '(555) 345-6789',
    source: 'referral',
    status: 'application',
    score: 95,
    propertyInterest: 'Sunset Apartments - Unit 101',
    budget: 2200,
    moveInDate: '2025-11-20',
    lastContact: '2025-11-05',
    notes: 'Application submitted, excellent credit',
    createdAt: '2025-10-25'
  },
  {
    id: '4',
    name: 'David Park',
    email: 'dpark@email.com',
    phone: '(555) 456-7890',
    source: 'apartments.com',
    status: 'new',
    score: 65,
    propertyInterest: 'Downtown Lofts',
    budget: 2000,
    moveInDate: '2025-12-15',
    lastContact: '2025-11-03',
    notes: 'Initial inquiry, needs follow-up',
    createdAt: '2025-11-03'
  },
  {
    id: '5',
    name: 'Jennifer Lee',
    email: 'jlee@email.com',
    phone: '(555) 567-8901',
    source: 'social',
    status: 'contacted',
    score: 78,
    propertyInterest: 'Riverside Complex',
    budget: 2800,
    moveInDate: '2026-01-01',
    lastContact: '2025-11-04',
    notes: 'Responded to Facebook ad, interested in amenities',
    createdAt: '2025-11-01'
  }
];

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-purple-100 text-purple-700', icon: Phone },
  qualified: { label: 'Qualified', color: 'bg-yellow-100 text-yellow-700', icon: CheckCircle },
  touring: { label: 'Touring', color: 'bg-orange-100 text-orange-700', icon: Calendar },
  application: { label: 'Application', color: 'bg-indigo-100 text-indigo-700', icon: Activity },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const SOURCE_LABELS = {
  website: 'Website',
  referral: 'Referral',
  zillow: 'Zillow',
  'apartments.com': 'Apartments.com',
  'walk-in': 'Walk-in',
  social: 'Social Media'
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS_FALLBACK);
  const [loading, setLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const data = await leadsService.getLeads();
        if (data && data.length > 0) {
          setLeads(data);
        }
      } catch (error) {
        console.error('Failed to load leads, using fallback data:', error);
        // Keep fallback data on error
      } finally {
        setLoading(false);
      }
    };
    loadLeads();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const conversionRate = leads.length > 0 
      ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1)
      : '0';
    const avgScore = leads.length > 0
      ? (leads.reduce((sum, l) => sum + l.score, 0) / leads.length).toFixed(0)
      : '0';

    return { totalLeads, newLeads, qualifiedLeads, conversionRate, avgScore };
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm);
      const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, selectedStatus]);

  // Group by status for pipeline view
  const pipelineData = useMemo(() => {
    const groups = {
      new: leads.filter(l => l.status === 'new'),
      contacted: leads.filter(l => l.status === 'contacted'),
      qualified: leads.filter(l => l.status === 'qualified'),
      touring: leads.filter(l => l.status === 'touring'),
      application: leads.filter(l => l.status === 'application'),
      converted: leads.filter(l => l.status === 'converted')
    };
    return groups;
  }, [leads]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-darker">Lead CRM</h1>
          <p className="text-neutral-medium mt-1">Manage and track your sales pipeline</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-5 h-5" />
          Add Lead
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Total Leads</p>
              <p className="text-3xl font-bold text-neutral-darker mt-1">{metrics.totalLeads}</p>
            </div>
            <Users className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">New Leads</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.newLeads}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Qualified</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{metrics.qualifiedLeads}</p>
            </div>
            <Star className="w-10 h-10 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.conversionRate}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-medium">Avg Score</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{metrics.avgScore}</p>
            </div>
            <BarChart3 className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-light">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium w-5 h-5" />
              <input
                type="text"
                placeholder="Search leads..."
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
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="touring">Touring</option>
              <option value="application">Application</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-neutral-lighter text-neutral-dark hover:bg-neutral-light'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'pipeline'
                  ? 'bg-primary text-white'
                  : 'bg-neutral-lighter text-neutral-dark hover:bg-neutral-light'
              }`}
            >
              Pipeline View
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-lighter border-b border-neutral-light">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Lead</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Contact</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Property</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Budget</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Move-In</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {filteredLeads.map((lead) => {
                const statusConfig = STATUS_CONFIG[lead.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr key={lead.id} className="hover:bg-neutral-lighter transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-neutral-darker">{lead.name}</div>
                      <div className="text-sm text-neutral-medium">Added {lead.createdAt}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-dark">
                          <Mail className="w-4 h-4" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-dark">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`text-lg font-bold ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-dark">{lead.propertyInterest}</td>
                    <td className="py-4 px-4 text-sm font-medium text-neutral-darker">
                      ${lead.budget.toLocaleString()}/mo
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-dark">{lead.moveInDate}</td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-medium">
                        {SOURCE_LABELS[lead.source]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-neutral-medium">
              No leads found matching your criteria
            </div>
          )}
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(pipelineData).map(([status, statusLeads]) => {
            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            const Icon = config.icon;
            
            return (
              <div key={status} className="bg-white rounded-lg shadow-sm border border-neutral-light p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-neutral-medium" />
                    <h3 className="font-semibold text-neutral-darker">{config.label}</h3>
                  </div>
                  <span className="text-sm font-medium text-neutral-medium">
                    {statusLeads.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {statusLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 bg-neutral-lighter rounded-lg border border-neutral-light hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="font-medium text-sm text-neutral-darker mb-1">
                        {lead.name}
                      </div>
                      <div className="text-xs text-neutral-medium mb-2">
                        {lead.propertyInterest}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${getScoreColor(lead.score)}`}>
                          Score: {lead.score}
                        </span>
                        <span className="text-xs text-neutral-medium">
                          ${(lead.budget / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  ))}

                  {statusLeads.length === 0 && (
                    <div className="text-center py-6 text-xs text-neutral-medium">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
