import { Building, Users, Calendar, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import type { LeaseStats } from '../../types/lease';

interface LeaseStatsCardsProps {
  stats: LeaseStats;
}

export default function LeaseStatsCards({ stats }: LeaseStatsCardsProps) {
  const cards = [
    {
      title: 'Total Leases',
      value: stats.total_leases,
      icon: Building,
      color: 'teal',
      description: 'All lease agreements'
    },
    {
      title: 'Active Leases',
      value: stats.active_leases,
      icon: Users,
      color: 'green',
      description: `${stats.active_leases} units occupied`
    },
    {
      title: 'Expiring Soon',
      value: stats.expiring_soon,
      icon: Calendar,
      color: 'orange',
      description: 'Within 60 days'
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancy_rate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'blue',
      description: 'Current occupancy'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.total_monthly_rent.toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
      description: 'From active leases'
    },
    {
      title: 'Pending Leases',
      value: stats.pending_leases,
      icon: AlertTriangle,
      color: 'yellow',
      description: 'Awaiting approval'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      teal: {
        bg: 'bg-teal-50',
        icon: 'text-teal-600',
        text: 'text-teal-600'
      },
      green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        text: 'text-green-600'
      },
      orange: {
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        text: 'text-orange-600'
      },
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        text: 'text-blue-600'
      },
      yellow: {
        bg: 'bg-yellow-50',
        icon: 'text-yellow-600',
        text: 'text-yellow-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.teal;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colorClasses = getColorClasses(card.color);
        
        return (
          <div
            key={card.title}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">
                  {card.description}
                </p>
              </div>
              <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
              </div>
            </div>
            
            {/* Progress bar for occupancy rate */}
            {card.title === 'Occupancy Rate' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.occupancy_rate >= 90 ? 'bg-green-500' :
                      stats.occupancy_rate >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(stats.occupancy_rate, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}