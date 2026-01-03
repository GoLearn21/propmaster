import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui';
import { Clock, CheckCircle2, Wrench, DollarSign, FileText, MessageSquare } from 'lucide-react';
import { ActivityItem } from '../../services/dashboardService';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activities, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across all modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'task':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'lease':
        return <FileText className="h-4 w-4" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-accent-green/10 text-accent-green';
      case 'task':
        return 'bg-status-success/10 text-status-success';
      case 'maintenance':
        return 'bg-status-warning/10 text-status-warning';
      case 'lease':
        return 'bg-primary/10 text-primary';
      case 'communication':
        return 'bg-status-info/10 text-status-info';
      default:
        return 'bg-neutral-light text-neutral-medium';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: string; label: string }> = {
      'pending': { variant: 'warning', label: 'Pending' },
      'in_progress': { variant: 'info', label: 'In Progress' },
      'completed': { variant: 'success', label: 'Completed' },
      'cancelled': { variant: 'error', label: 'Cancelled' },
      'paid': { variant: 'success', label: 'Paid' },
      'overdue': { variant: 'error', label: 'Overdue' },
    };

    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant as any} size="sm">{config.label}</Badge>;
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across all modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <p className="text-neutral-medium">No recent activity</p>
            <p className="text-sm text-neutral-light mt-2">Activity will appear here as you use the system</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates from tasks, payments, leases, and more</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {activities.map((activity, index) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-lighter/50 transition-colors border border-neutral-lighter"
            >
              {/* Icon */}
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-black text-sm truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-neutral-medium mt-0.5">
                      {activity.description}
                    </p>
                    {(activity.propertyName || activity.tenantName) && (
                      <div className="flex items-center gap-2 mt-1">
                        {activity.propertyName && (
                          <span className="text-xs text-neutral-medium bg-neutral-lighter px-2 py-0.5 rounded">
                            {activity.propertyName}
                          </span>
                        )}
                        {activity.tenantName && (
                          <span className="text-xs text-neutral-medium bg-neutral-lighter px-2 py-0.5 rounded">
                            {activity.tenantName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status/Amount */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {activity.amount !== undefined && (
                      <span className="text-sm font-semibold text-accent-green">
                        ${activity.amount.toLocaleString()}
                      </span>
                    )}
                    {activity.status && getStatusBadge(activity.status)}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="h-3 w-3 text-neutral-light" />
                  <span className="text-xs text-neutral-light">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
