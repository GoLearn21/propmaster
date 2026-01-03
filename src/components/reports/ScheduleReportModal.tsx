import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface ScheduleReportModalProps {
  reportName: string;
  onClose: () => void;
  onSchedule: (schedule: ReportSchedule) => void;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  emailTo: string[];
  format: 'pdf' | 'excel' | 'csv';
}

export default function ScheduleReportModal({ reportName, onClose, onSchedule }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState<ReportSchedule['frequency']>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState('09:00');
  const [emailTo, setEmailTo] = useState('');
  const [format, setFormat] = useState<ReportSchedule['format']>('pdf');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const emails = emailTo.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      alert('Please enter at least one email address');
      return;
    }

    const schedule: ReportSchedule = {
      frequency,
      time,
      emailTo: emails,
      format,
    };

    if (frequency === 'weekly') {
      schedule.dayOfWeek = dayOfWeek;
    } else if (frequency === 'monthly' || frequency === 'quarterly') {
      schedule.dayOfMonth = dayOfMonth;
    }

    onSchedule(schedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Schedule Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report</label>
            <div className="px-4 py-2 bg-gray-50 rounded-md text-gray-900">{reportName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ReportSchedule['frequency'])}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
          )}

          {(frequency === 'monthly' || frequency === 'quarterly') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportSchedule['format'])}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email To (comma-separated)
            </label>
            <input
              type="text"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
            >
              Schedule Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
