import { useState, useMemo } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  DollarSign,
  FileText,
  Home,
  Users,
  Mail,
  Phone,
  X,
  Filter,
  MarkAsRead,
  Archive,
  Trash2,
  Settings,
  Send,
  RefreshCw
} from 'lucide-react';

import type { Lease, LeaseStats } from '../types/lease';

interface Notification {
  id: string;
  type: 'expiration' | 'renewal' | 'payment' | 'document' | 'maintenance' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  read_at?: string;
  action_required: boolean;
  lease_id?: string;
  property_id?: string;
  data?: any;
}

interface LeaseNotificationsProps {
  expiringLeases: any[];
  stats: LeaseStats | null;
}

export default function LeaseNotifications({ expiringLeases, stats }: LeaseNotificationsProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Mock notifications data
  const notifications: Notification[] = useMemo(() => {
    const notificationList: Notification[] = [];

    // Add expiration notifications
    expiringLeases.forEach((lease, index) => {
      const daysUntilExpiration = lease.days_until_expiration;
      let priority: Notification['priority'] = 'low';
      let title = '';
      let message = '';

      if (daysUntilExpiration <= 7) {
        priority = 'urgent';
        title = 'Lease Expiring in 7 Days';
        message = `Lease ${lease.lease_number} at ${lease.property_name} expires in ${daysUntilExpiration} days. Immediate action required.`;
      } else if (daysUntilExpiration <= 30) {
        priority = 'high';
        title = 'Lease Expiring Soon';
        message = `Lease ${lease.lease_number} expires in ${daysUntilExpiration} days. Consider renewal discussions.`;
      } else {
        priority = 'medium';
        title = 'Upcoming Lease Expiration';
        message = `Lease ${lease.lease_number} expires in ${daysUntilExpiration} days.`;
      }

      notificationList.push({
        id: `exp-${lease.id}`,
        type: 'expiration',
        title,
        message,
        priority,
        status: daysUntilExpiration <= 7 ? 'unread' : 'read',
        created_at: new Date().toISOString(),
        action_required: daysUntilExpiration <= 30,
        lease_id: lease.id,
        data: lease
      });
    });

    // Add payment notifications
    if (stats && stats.total_monthly_rent > 0) {
      notificationList.push({
        id: 'payment-1',
        type: 'payment',
        title: 'Monthly Rent Collection',
        message: `${stats.active_leases} active leases generating $${stats.total_monthly_rent.toLocaleString()} monthly revenue`,
        priority: 'medium',
        status: 'read',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        action_required: false,
        data: { totalRevenue: stats.total_monthly_rent, activeLeases: stats.active_leases }
      });
    }

    // Add occupancy notifications
    if (stats && stats.occupancy_rate < 90) {
      notificationList.push({
        id: 'occupancy-1',
        type: 'system',
        title: 'Low Occupancy Rate Alert',
        message: `Occupancy rate is ${stats.occupancy_rate.toFixed(1)}%. Consider marketing vacant units.`,
        priority: 'high',
        status: 'unread',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        action_required: true,
        data: { occupancyRate: stats.occupancy_rate }
      });
    }

    // Add renewal notifications
    notificationList.push({
      id: 'renewal-1',
      type: 'renewal',
      title: 'Lease Renewal Opportunities',
      message: '3 leases are approaching renewal. Start renewal discussions with tenants.',
      priority: 'medium',
      status: 'read',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      action_required: true,
      data: { leaseCount: 3 }
    });

    // Add document notifications
    notificationList.push({
      id: 'document-1',
      type: 'document',
      title: 'Signature Requests Pending',
      message: '2 documents require tenant signatures. Follow up on pending requests.',
      priority: 'high',
      status: 'unread',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      action_required: true,
      data: { pendingSignatures: 2 }
    });

    return notificationList;
  }, [expiringLeases, stats]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Status filter
      if (selectedFilter !== 'all' && notification.status !== selectedFilter) return false;
      
      // Priority filter
      if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false;
      
      return true;
    });
  }, [notifications, selectedFilter, priorityFilter]);

  const notificationStats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => n.status === 'unread').length;
    const urgent = notifications.filter(n => n.priority === 'urgent').length;
    const actionRequired = notifications.filter(n => n.action_required).length;
    
    return { total, unread, urgent, actionRequired };
  }, [notifications]);

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'expiration':
        return <Calendar className="w-5 h-5 text-red-500" />;
      case 'renewal':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'maintenance':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityIcon = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const markAsRead = (notificationId: string) => {
    console.log('Mark as read:', notificationId);
    // Update notification status
  };

  const markAllAsRead = () => {
    console.log('Mark all as read');
    // Mark all notifications as read
  };

  const archiveNotification = (notificationId: string) => {
    console.log('Archive notification:', notificationId);
    // Archive notification
  };

  const deleteNotification = (notificationId: string) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      console.log('Delete notification:', notificationId);
      // Delete notification
    }
  };

  const handleBulkAction = (action: string) => {
    selectedNotifications.forEach(notificationId => {
      switch (action) {
        case 'read':
          markAsRead(notificationId);
          break;
        case 'archive':
          archiveNotification(notificationId);
          break;
        case 'delete':
          deleteNotification(notificationId);
          break;
      }
    });
    setSelectedNotifications([]);
  };

  const sendReminder = (leaseId: string) => {
    console.log('Send reminder for lease:', leaseId);
    alert('Reminder sent successfully!');
  };

  const generateReport = () => {
    console.log('Generate notification report');
    // Generate PDF report
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease Notifications</h2>
          <p className="text-sm text-gray-600 mt-1">
            Stay informed about lease expirations and important updates
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" />
            Report
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notificationStats.total}</p>
              <p className="text-xs text-gray-500">all time</p>
            </div>
            <Bell className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-red-900">{notificationStats.unread}</p>
              <p className="text-xs text-red-600">requiring attention</p>
            </div>
            <Mail className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-orange-900">{notificationStats.urgent}</p>
              <p className="text-xs text-orange-600">immediate action needed</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Action Required</p>
              <p className="text-2xl font-bold text-purple-900">{notificationStats.actionRequired}</p>
              <p className="text-xs text-purple-600">pending actions</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className="px-3 py-2 text-sm text-teal-600 hover:text-teal-700"
            >
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('read')}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Mark Read
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border shadow-sm text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-600">You're all caught up! No notifications match your current filters.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white border-l-4 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                getPriorityColor(notification.priority)
              } ${notification.status === 'unread' ? 'border-l-4' : ''}`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedNotifications(prev => [...prev, notification.id]);
                    } else {
                      setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                    }
                  }}
                  className="mt-1"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(notification.type)}
                      <div>
                        <h3 className={`text-sm font-medium ${
                          notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getPriorityIcon(notification.priority)}
                          <span className={`text-xs capitalize ${
                            notification.priority === 'urgent' ? 'text-red-600' :
                            notification.priority === 'high' ? 'text-orange-600' :
                            notification.priority === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {notification.priority}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500 capitalize">{notification.type}</span>
                          {notification.action_required && (
                            <>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-purple-600 font-medium">Action Required</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      {notification.status === 'unread' && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    notification.status === 'unread' ? 'text-gray-800' : 'text-gray-600'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {/* Context-specific action buttons */}
                  {notification.type === 'expiration' && notification.data && (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => sendReminder(notification.data.id)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Send Reminder
                      </button>
                      <button className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                        Start Renewal
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {notification.status === 'unread' && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-teal-600 hover:text-teal-700"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => archiveNotification(notification.id)}
                      className="text-xs text-gray-600 hover:text-gray-700"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                    <button className="text-xs text-gray-600 hover:text-gray-700">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Send className="w-6 h-6 text-blue-500 mb-2" />
            <div className="text-sm font-medium text-gray-900">Send Expiration Reminders</div>
            <div className="text-xs text-gray-600">Auto-remind about expiring leases</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Calendar className="w-6 h-6 text-green-500 mb-2" />
            <div className="text-sm font-medium text-gray-900">Schedule Follow-ups</div>
            <div className="text-xs text-gray-600">Set reminders for action items</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <FileText className="w-6 h-6 text-purple-500 mb-2" />
            <div className="text-sm font-medium text-gray-900">Generate Report</div>
            <div className="text-xs text-gray-600">Export notification summary</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Settings className="w-6 h-6 text-orange-500 mb-2" />
            <div className="text-sm font-medium text-gray-900">Notification Settings</div>
            <div className="text-xs text-gray-600">Configure preferences</div>
          </button>
        </div>
      </div>

      {/* Settings Modal would go here */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm text-gray-700">Email notifications</span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm text-gray-700">SMS notifications</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration alert threshold (days)
                </label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}