import { useState, useEffect } from 'react';
import { generateOverdueTasksReport } from '../../services/reportsService';

export default function OverdueTasksView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateOverdueTasksReport();
      setData(result);
    } catch (error) {
      console.error('Failed to load Overdue Tasks report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const criticalTasks = data.filter(t => t.priority === 'high').length;
  const avgDaysOverdue = data.length > 0 
    ? Math.round(data.reduce((sum, t) => sum + t.daysOverdue, 0) / data.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-700">Total Overdue</div>
          <div className="text-2xl font-semibold text-red-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm text-orange-700">Critical Priority</div>
          <div className="text-2xl font-semibold text-orange-900 mt-1">{criticalTasks}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-yellow-700">Avg Days Overdue</div>
          <div className="text-2xl font-semibold text-yellow-900 mt-1">{avgDaysOverdue}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((task, index) => (
              <tr key={index} className={`hover:bg-gray-50 ${task.daysOverdue > 30 ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 text-sm text-gray-900">{task.property}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.dueDate}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    task.daysOverdue > 30 ? 'bg-red-100 text-red-800' :
                    task.daysOverdue > 14 ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.daysOverdue} days
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.assignedTo || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-green-600 text-lg font-semibold">No overdue tasks!</div>
          <div className="text-gray-500 mt-2">All tasks are on track</div>
        </div>
      )}
    </div>
  );
}
