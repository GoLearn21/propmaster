import { useState, useEffect } from 'react';
import { generateTasksByPropertyReport } from '../../services/reportsService';

interface TasksByPropertyViewProps {
  filters: any;
}

export default function TasksByPropertyView({ filters }: TasksByPropertyViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateTasksByPropertyReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Tasks by Property report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const tasksByStatus = data.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-700">Total Tasks</div>
          <div className="text-2xl font-semibold text-blue-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-yellow-700">Pending</div>
          <div className="text-2xl font-semibold text-yellow-900 mt-1">{tasksByStatus.pending || 0}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-700">In Progress</div>
          <div className="text-2xl font-semibold text-purple-900 mt-1">{tasksByStatus.in_progress || 0}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">Completed</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">{tasksByStatus.completed || 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((task, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{task.property}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.type}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.dueDate || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.assignedTo || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
