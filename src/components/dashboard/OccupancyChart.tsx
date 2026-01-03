import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';
import { TrendingUp, Home } from 'lucide-react';
import { OccupancyTrendPoint } from '../../services/dashboardService';
import { useIsDarkMode } from '../../contexts/ThemeContext';

// Theme-aware chart colors
const getChartColors = (isDark: boolean) => ({
  grid: isDark ? '#374151' : '#E5E7EB',
  axis: isDark ? '#9CA3AF' : '#6B7280',
  tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
  tooltipBorder: isDark ? '#374151' : '#E5E7EB',
  tooltipText: isDark ? '#F9FAFB' : '#374151',
  areaStroke: isDark ? '#4F8EDB' : '#2F438D',
  areaFill: isDark ? '#4F8EDB' : '#2F438D',
});

interface OccupancyChartProps {
  data: OccupancyTrendPoint[];
  currentRate: number;
  loading?: boolean;
}

export const OccupancyChart: React.FC<OccupancyChartProps> = ({ data, currentRate, loading }) => {
  const isDarkMode = useIsDarkMode();
  const colors = getChartColors(isDarkMode);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Trend</CardTitle>
          <CardDescription>Unit occupancy rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgOccupancy = data.length > 0 
    ? data.reduce((sum, item) => sum + item.occupancyRate, 0) / data.length 
    : 0;

  const trend = data.length >= 2 
    ? data[data.length - 1].occupancyRate - data[0].occupancyRate
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Occupancy Trend</CardTitle>
            <CardDescription>Unit occupancy rate over the past 6 months</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-neutral-medium">Current Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-neutral-black">{currentRate.toFixed(1)}%</p>
                {trend !== 0 && (
                  <span className={`text-xs font-medium flex items-center ${trend > 0 ? 'text-status-success' : 'text-status-error'}`}>
                    <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.areaFill} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors.areaFill} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="month"
              stroke={colors.axis}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={colors.axis}
              style={{ fontSize: '12px' }}
              domain={[70, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: colors.tooltipText,
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
              labelStyle={{ fontWeight: 'bold', color: colors.tooltipText }}
            />
            <Area
              type="monotone"
              dataKey="occupancyRate"
              stroke={colors.areaStroke}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOccupancy)"
              name="Occupancy Rate"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-light">
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Average Rate</p>
            <p className="text-xl font-bold text-primary">
              {avgOccupancy.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">6-Month Trend</p>
            <p className={`text-xl font-bold ${trend >= 0 ? 'text-status-success' : 'text-status-error'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
