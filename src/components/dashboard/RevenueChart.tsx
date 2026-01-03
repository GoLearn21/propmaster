import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';
import { TrendingUp, DollarSign } from 'lucide-react';
import { RevenueDataPoint } from '../../services/dashboardService';
import { useIsDarkMode } from '../../contexts/ThemeContext';

// Theme-aware chart colors
const getChartColors = (isDark: boolean) => ({
  grid: isDark ? '#374151' : '#E5E7EB',
  axis: isDark ? '#9CA3AF' : '#6B7280',
  tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
  tooltipBorder: isDark ? '#374151' : '#E5E7EB',
  tooltipText: isDark ? '#F9FAFB' : '#374151',
});

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading }) => {
  const isDarkMode = useIsDarkMode();
  const colors = getChartColors(isDarkMode);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgMonthlyRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue, expenses, and profit trends</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-neutral-medium">Avg Monthly Revenue</p>
              <p className="text-lg font-bold text-neutral-black">
                ${avgMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="h-10 w-10 bg-accent-green/10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-accent-green" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="month"
              stroke={colors.axis}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={colors.axis}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: colors.tooltipText,
              }}
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#00CC66" 
              strokeWidth={2}
              dot={{ fill: '#00CC66', r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="#EF4A81" 
              strokeWidth={2}
              dot={{ fill: '#EF4A81', r: 4 }}
              activeDot={{ r: 6 }}
              name="Expenses"
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#2F438D" 
              strokeWidth={2}
              dot={{ fill: '#2F438D', r: 4 }}
              activeDot={{ r: 6 }}
              name="Profit"
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-light">
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-accent-green">
              ${totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-accent-pink">
              ${totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-medium mb-1">Net Profit</p>
            <p className="text-xl font-bold text-primary">
              ${totalProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
