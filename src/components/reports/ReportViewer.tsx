import { useState, useEffect } from 'react';
import { X, Download, Calendar, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Report } from '../../services/reportsService';
import {
  generateARAgingReport,
  generateRentRollReport,
  generateCurrentTenantsReport,
  generateTasksByPropertyReport,
  generateOverdueTasksReport,
} from '../../services/reportsService';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import ScheduleReportModal, { ReportSchedule } from './ScheduleReportModal';
import ARAgingReportView from './ARAgingReportView';
import BalanceSheetView from './BalanceSheetView';
import ProfitLossView from './ProfitLossView';
import CashFlowView from './CashFlowView';
import PropertyReservesView from './PropertyReservesView';
import RentRollView from './RentRollView';
import CurrentTenantsView from './CurrentTenantsView';
import GeneralLedgerView from './GeneralLedgerView';
import TasksByPropertyView from './TasksByPropertyView';
import OverdueTasksView from './OverdueTasksView';
import UndepositedFundsView from './UndepositedFundsView';

interface ReportViewerProps {
  report: Report;
  onClose: () => void;
}

export default function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleExportCSV = async () => {
    try {
      let data: any[] = [];
      switch (report.id) {
        case 'ar-aging':
          data = await generateARAgingReport(dateRange);
          break;
        case 'rent-roll':
          data = await generateRentRollReport(dateRange);
          break;
        case 'current-tenants':
          data = await generateCurrentTenantsReport(dateRange);
          break;
        case 'tasks-by-property':
          data = await generateTasksByPropertyReport(dateRange);
          break;
        case 'overdue-tasks':
          data = await generateOverdueTasksReport();
          break;
      }
      if (data.length > 0) {
        exportToCSV(data, `${report.name} - ${new Date().toISOString().split('T')[0]}`);
        toast.success('Report exported successfully');
      } else {
        toast.error('No data to export');
      }
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportExcel = async () => {
    try {
      let data: any[] = [];
      switch (report.id) {
        case 'ar-aging':
          data = await generateARAgingReport(dateRange);
          break;
        case 'rent-roll':
          data = await generateRentRollReport(dateRange);
          break;
        case 'current-tenants':
          data = await generateCurrentTenantsReport(dateRange);
          break;
        case 'tasks-by-property':
          data = await generateTasksByPropertyReport(dateRange);
          break;
        case 'overdue-tasks':
          data = await generateOverdueTasksReport();
          break;
      }
      if (data.length > 0) {
        exportToExcel(data, `${report.name} - ${new Date().toISOString().split('T')[0]}`);
        toast.success('Report exported successfully');
      } else {
        toast.error('No data to export');
      }
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSchedule = (schedule: ReportSchedule) => {
    // In production, this would save to database and set up cron job
    console.log('Schedule report:', { report: report.name, schedule });
    toast.success(`Report scheduled ${schedule.frequency}`);
  };

  const renderReportContent = () => {
    switch (report.id) {
      case 'ar-aging':
        return <ARAgingReportView filters={dateRange} />;
      case 'balance-sheet':
        return <BalanceSheetView filters={dateRange} />;
      case 'profit-loss':
        return <ProfitLossView filters={dateRange} />;
      case 'cash-flow':
        return <CashFlowView filters={dateRange} />;
      case 'property-reserves':
        return <PropertyReservesView filters={dateRange} />;
      case 'rent-roll':
        return <RentRollView filters={dateRange} />;
      case 'current-tenants':
        return <CurrentTenantsView filters={dateRange} />;
      case 'general-ledger':
        return <GeneralLedgerView filters={dateRange} />;
      case 'tasks-by-property':
        return <TasksByPropertyView filters={dateRange} />;
      case 'overdue-tasks':
        return <OverdueTasksView />;
      case 'undeposited-funds':
        return <UndepositedFundsView />;
      default:
        return <div className="text-gray-500">Report view not implemented</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{report.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderReportContent()}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleReportModal
          reportName={report.name}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleSchedule}
        />
      )}
    </div>
  );
}
