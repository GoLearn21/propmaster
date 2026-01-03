import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Star,
  DollarSign,
  Scale,
  TrendingUp,
  ArrowDownUp,
  PiggyBank,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Wallet,
  ChevronRight,
  Download,
  Calendar,
  Clock,
  Bookmark,
  Trash2,
  Play,
  Pause,
  Mail,
} from 'lucide-react';
import {
  Report,
  ReportCategory,
  getReportsWithFavorites,
  toggleFavoriteReport,
  getSavedReports,
  getScheduledReports,
  deleteSavedReport,
  deleteScheduledReport,
  toggleScheduledReport,
  scheduleReport,
  SavedReport,
  ScheduledReport,
} from '../services/reportsService';
import ReportViewer from '../components/reports/ReportViewer';
import ScheduleReportModal, { ReportSchedule } from '../components/reports/ScheduleReportModal';
import toast from 'react-hot-toast';

// Icon mapping
const iconMap: Record<string, any> = {
  DollarSign,
  Scale,
  TrendingUp,
  ArrowDownUp,
  PiggyBank,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Wallet,
};

// Category display names and order
const categoryConfig: { id: ReportCategory | 'favorites'; label: string; order: number }[] = [
  { id: 'favorites', label: 'Favorites', order: 1 },
  { id: 'business_overview', label: 'Business Overview', order: 2 },
  { id: 'financial', label: 'Financial Reports', order: 3 },
  { id: 'operational', label: 'Operational Reports', order: 4 },
  { id: 'tenant_management', label: 'Tenant Management', order: 5 },
];

type ViewMode = 'reports' | 'saved' | 'scheduled';

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'favorites' | 'all'>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('reports');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [reportToSchedule, setReportToSchedule] = useState<Report | null>(null);

  useEffect(() => {
    loadReports();
    loadSavedReports();
    loadScheduledReports();

    // Setup keyboard shortcut for search (Ctrl+F / Cmd+F)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('report-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadReports = () => {
    const reportsWithFavorites = getReportsWithFavorites();
    setReports(reportsWithFavorites);
  };

  const loadSavedReports = () => {
    const saved = getSavedReports();
    setSavedReports(saved);
  };

  const loadScheduledReports = () => {
    const scheduled = getScheduledReports();
    setScheduledReports(scheduled);
  };

  const handleToggleFavorite = (reportId: string) => {
    toggleFavoriteReport(reportId);
    loadReports();
  };

  const handleScheduleClick = (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToSchedule(report);
    setShowScheduleModal(true);
  };

  const handleScheduleReport = (schedule: ReportSchedule) => {
    if (!reportToSchedule) return;

    scheduleReport({
      reportId: reportToSchedule.id,
      reportName: reportToSchedule.name,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      time: schedule.time,
      emailTo: schedule.emailTo,
      format: schedule.format,
    });

    toast.success(`Report scheduled ${schedule.frequency}`);
    loadScheduledReports();
    setShowScheduleModal(false);
    setReportToSchedule(null);
  };

  const handleDeleteSaved = (id: string) => {
    if (deleteSavedReport(id)) {
      toast.success('Saved report deleted');
      loadSavedReports();
    }
  };

  const handleDeleteScheduled = (id: string) => {
    if (deleteScheduledReport(id)) {
      toast.success('Scheduled report deleted');
      loadScheduledReports();
    }
  };

  const handleToggleScheduled = (id: string) => {
    const isActive = toggleScheduledReport(id);
    toast.success(isActive ? 'Schedule activated' : 'Schedule paused');
    loadScheduledReports();
  };

  // Filter reports based on search and category
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter by category
    if (selectedCategory === 'favorites') {
      filtered = filtered.filter(r => r.isFavorite);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reports, selectedCategory, searchQuery]);

  // Group reports by category for display
  const groupedReports = useMemo(() => {
    const groups: Record<string, Report[]> = {};

    if (selectedCategory === 'all' && !searchQuery) {
      // Show all categories when viewing "All Reports"
      categoryConfig.forEach(cat => {
        if (cat.id === 'favorites') {
          groups[cat.label] = reports.filter(r => r.isFavorite);
        } else {
          groups[cat.label] = reports.filter(r => r.category === cat.id);
        }
      });
    } else {
      // Show filtered results in a single group
      groups['Reports'] = filteredReports;
    }

    return groups;
  }, [reports, filteredReports, selectedCategory, searchQuery]);

  const getCategoryCount = (categoryId: ReportCategory | 'favorites') => {
    if (categoryId === 'favorites') {
      return reports.filter(r => r.isFavorite).length;
    }
    return reports.filter(r => r.category === categoryId).length;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly'
    };
    return labels[freq] || freq;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Reports</h1>

          {/* View Mode Tabs */}
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => setViewMode('reports')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                viewMode === 'reports'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>All Reports</span>
            </button>
            <button
              onClick={() => setViewMode('saved')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                viewMode === 'saved'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Reports</span>
              {savedReports.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {savedReports.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('scheduled')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                viewMode === 'scheduled'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Scheduled</span>
              {scheduledReports.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {scheduledReports.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar - only for reports view */}
          {viewMode === 'reports' && (
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="report-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a report (Ctrl+F)"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Category Tabs - only for reports view */}
        {viewMode === 'reports' && (
          <div className="px-8 border-t border-gray-200">
            <div className="flex space-x-1 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                All Reports
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {reports.length}
                </span>
              </button>
              {categoryConfig.map(cat => {
                const count = getCategoryCount(cat.id);
                if (count === 0 && cat.id !== 'favorites') return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      selectedCategory === cat.id
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        {/* Reports Grid View */}
        {viewMode === 'reports' && (
          <>
            {Object.entries(groupedReports).map(([categoryLabel, categoryReports]) => {
              if (categoryReports.length === 0) return null;

              return (
                <div key={categoryLabel} className="mb-10">
                  {(selectedCategory === 'all' && !searchQuery) && (
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{categoryLabel}</h2>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryReports.map(report => {
                      const IconComponent = iconMap[report.icon] || FileText;

                      return (
                        <div
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-teal-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                                  {report.name}
                                </h3>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(report.id);
                              }}
                              className="flex-shrink-0 text-gray-400 hover:text-yellow-500 transition-colors"
                              title={report.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star
                                className={`w-5 h-5 ${report.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                              />
                            </button>
                          </div>

                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {report.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1"
                                title="View Report"
                              >
                                <span>View Report</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Export Report"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleScheduleClick(report, e)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Schedule Report"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Empty State for Reports */}
            {filteredReports.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? `No reports match "${searchQuery}". Try a different search term.`
                    : selectedCategory === 'favorites'
                    ? 'You have not favorited any reports yet. Click the star icon on any report to add it to favorites.'
                    : 'No reports available in this category.'
                  }
                </p>
              </div>
            )}
          </>
        )}

        {/* Saved Reports View */}
        {viewMode === 'saved' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Saved Reports</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your saved report configurations for quick access
              </p>
            </div>

            {savedReports.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved reports</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Save report configurations with specific filters to quickly access them later.
                  Open a report and click "Save Configuration" to get started.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {savedReports.map((saved) => (
                    <tr key={saved.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{saved.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{saved.reportName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {saved.filters.startDate && saved.filters.endDate
                          ? `${saved.filters.startDate} - ${saved.filters.endDate}`
                          : 'All time'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(saved.createdAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                            onClick={() => {
                              const report = reports.find(r => r.id === saved.reportId);
                              if (report) setSelectedReport(report);
                            }}
                          >
                            View
                          </button>
                          <button
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteSaved(saved.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Scheduled Reports View */}
        {viewMode === 'scheduled' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
              <p className="text-sm text-gray-600 mt-1">
                Automatically generated and emailed reports
              </p>
            </div>

            {scheduledReports.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled reports</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Schedule reports to be automatically generated and emailed to you.
                  Click the calendar icon on any report to schedule it.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduledReports.map((scheduled) => (
                    <tr key={scheduled.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{scheduled.reportName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getFrequencyLabel(scheduled.frequency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{scheduled.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{scheduled.emailTo.join(', ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {scheduled.nextRun ? formatDate(scheduled.nextRun) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          scheduled.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scheduled.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            className={`${scheduled.isActive ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}
                            onClick={() => handleToggleScheduled(scheduled.id)}
                            title={scheduled.isActive ? 'Pause' : 'Resume'}
                          >
                            {scheduled.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteScheduled(scheduled.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && reportToSchedule && (
        <ScheduleReportModal
          reportName={reportToSchedule.name}
          onClose={() => {
            setShowScheduleModal(false);
            setReportToSchedule(null);
          }}
          onSchedule={handleScheduleReport}
        />
      )}
    </div>
  );
}
