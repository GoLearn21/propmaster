import { FileText, Clock, CheckCircle, XCircle, Users, AlertTriangle } from 'lucide-react';

interface ApplicationStatsCardsProps {
  stats: {
    total: number;
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
}

export default function ApplicationStatsCards({ stats }: ApplicationStatsCardsProps) {
  const cards = [
    {
      title: 'Total Applications',
      value: stats.total,
      icon: FileText,
      color: 'teal',
      description: 'All applications'
    },
    {
      title: 'Pending Review',
      value: stats.submitted + stats.under_review,
      icon: Clock,
      color: 'yellow',
      description: `${stats.submitted} submitted, ${stats.under_review} reviewing`
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'green',
      description: 'Ready for lease signing'
    },
    {
      title: 'Draft Applications',
      value: stats.draft,
      icon: Users,
      color: 'gray',
      description: 'Not yet submitted'
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'red',
      description: 'Not approved'
    },
    {
      title: 'Conversion Rate',
      value: stats.total > 0 ? `${((stats.approved / stats.total) * 100).toFixed(1)}%` : '0%',
      icon: AlertTriangle,
      color: 'blue',
      description: 'Approved rate'
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
      yellow: {
        bg: 'bg-yellow-50',
        icon: 'text-yellow-600',
        text: 'text-yellow-600'
      },
      red: {
        bg: 'bg-red-50',
        icon: 'text-red-600',
        text: 'text-red-600'
      },
      gray: {
        bg: 'bg-gray-50',
        icon: 'text-gray-600',
        text: 'text-gray-600'
      },
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        text: 'text-blue-600'
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
            
            {/* Progress indicator for conversion rate */}
            {card.title === 'Conversion Rate' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-green-500 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(((stats.approved / Math.max(stats.total, 1)) * 100), 100)}%` 
                    }}
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