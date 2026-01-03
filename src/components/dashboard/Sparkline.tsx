import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useIsDarkMode } from '../../contexts/ThemeContext';

/**
 * Sparkline Component - Titanium Precision Design System
 *
 * Features:
 * - SVG-based mini line charts
 * - Smooth curve interpolation
 * - Gradient fill option
 * - Animated drawing effect
 * - Multiple variants (line, area, bar)
 */

interface SparklineProps extends React.SVGAttributes<SVGSVGElement> {
  /** Data points to plot */
  data: number[];
  /** Chart variant */
  variant?: 'line' | 'area' | 'bar';
  /** Stroke color (tailwind color or hex) */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | string;
  /** Animate the drawing */
  animated?: boolean;
  /** Show dots at data points */
  showDots?: boolean;
  /** Stroke width */
  strokeWidth?: number;
}

const colorMap: Record<string, string> = {
  primary: '#20B2AA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      className,
      data,
      variant = 'line',
      color = 'primary',
      animated = true,
      showDots = false,
      strokeWidth = 2,
      width = 100,
      height = 32,
      ...props
    },
    ref
  ) => {
    const isDarkMode = useIsDarkMode();
    const resolvedColor = colorMap[color] || color;
    const dotFill = isDarkMode ? '#1F2937' : '#FFFFFF';

    // Calculate path and dimensions
    const { path, areaPath, points, viewBox } = useMemo(() => {
      if (!data || data.length < 2) {
        return { path: '', areaPath: '', points: [], viewBox: '0 0 100 32' };
      }

      const padding = 4;
      const chartWidth = Number(width) - padding * 2;
      const chartHeight = Number(height) - padding * 2;

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      // Calculate points
      const pts = data.map((value, index) => ({
        x: padding + (index / (data.length - 1)) * chartWidth,
        y: padding + (1 - (value - min) / range) * chartHeight,
      }));

      // Create smooth curve path using cardinal spline
      const tension = 0.4;
      let linePath = `M ${pts[0].x},${pts[0].y}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;

        const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
        const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
        const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
        const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

        linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }

      // Create area path (closes to bottom)
      const area = `${linePath} L ${pts[pts.length - 1].x},${Number(height) - padding} L ${pts[0].x},${Number(height) - padding} Z`;

      return {
        path: linePath,
        areaPath: area,
        points: pts,
        viewBox: `0 0 ${width} ${height}`,
      };
    }, [data, width, height]);

    // Calculate bar dimensions
    const bars = useMemo(() => {
      if (variant !== 'bar' || !data || data.length === 0) return [];

      const padding = 4;
      const chartWidth = Number(width) - padding * 2;
      const chartHeight = Number(height) - padding * 2;

      const min = Math.min(...data, 0);
      const max = Math.max(...data);
      const range = max - min || 1;

      const barWidth = chartWidth / data.length - 2;

      return data.map((value, index) => {
        const barHeight = ((value - min) / range) * chartHeight;
        return {
          x: padding + index * (chartWidth / data.length) + 1,
          y: padding + chartHeight - barHeight,
          width: Math.max(barWidth, 2),
          height: barHeight,
        };
      });
    }, [data, variant, width, height]);

    if (!data || data.length < 2) {
      return null;
    }

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={viewBox}
        className={cn('overflow-visible', className)}
        {...props}
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolvedColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {variant === 'bar' ? (
          // Bar chart
          <g>
            {bars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={resolvedColor}
                rx={1}
                className={cn(
                  animated && 'animate-fade-in',
                  animated && { animationDelay: `${i * 50}ms` }
                )}
                style={animated ? { animationDelay: `${i * 50}ms` } : undefined}
              />
            ))}
          </g>
        ) : (
          // Line/Area chart
          <g>
            {/* Area fill */}
            {variant === 'area' && (
              <path
                d={areaPath}
                fill={`url(#sparkline-gradient-${color})`}
                className={cn(animated && 'animate-fade-in')}
              />
            )}

            {/* Line */}
            <path
              d={path}
              fill="none"
              stroke={resolvedColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(animated && 'animate-sparkline')}
              style={
                animated
                  ? {
                      strokeDasharray: 1000,
                      strokeDashoffset: 1000,
                      animation: 'sparkline-draw 1s ease-out forwards',
                    }
                  : undefined
              }
            />

            {/* Dots */}
            {showDots &&
              points.map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill={dotFill}
                  stroke={resolvedColor}
                  strokeWidth={2}
                  className={cn(animated && 'animate-scale-in')}
                  style={animated ? { animationDelay: `${500 + i * 50}ms` } : undefined}
                />
              ))}
          </g>
        )}
      </svg>
    );
  }
);

Sparkline.displayName = 'Sparkline';

/**
 * SparklineWithTooltip - Sparkline with hover tooltip
 */
interface SparklineWithTooltipProps extends SparklineProps {
  /** Labels for each data point */
  labels?: string[];
  /** Format function for tooltip value */
  formatValue?: (value: number) => string;
}

const SparklineWithTooltip = React.forwardRef<SVGSVGElement, SparklineWithTooltipProps>(
  ({ labels, formatValue = (v) => v.toString(), ...props }, ref) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    const { data, width = 100, height = 32 } = props;

    if (!data || data.length < 2) return null;

    const padding = 4;
    const chartWidth = Number(width) - padding * 2;

    return (
      <div className="relative">
        <Sparkline ref={ref} {...props} />
        {/* Invisible hover zones */}
        <div
          className="absolute inset-0 flex"
          style={{ padding: `${padding}px` }}
        >
          {data.map((value, i) => (
            <div
              key={i}
              className="flex-1 cursor-crosshair"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </div>
        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className={cn(
              'absolute -top-8 px-2 py-1 rounded',
              'bg-neutral-900 text-white text-xs font-medium',
              'transform -translate-x-1/2',
              'pointer-events-none',
              'animate-fade-in'
            )}
            style={{
              left:
                padding +
                (hoveredIndex / (data.length - 1)) * chartWidth,
            }}
          >
            {labels?.[hoveredIndex] && (
              <span className="text-neutral-400">{labels[hoveredIndex]}: </span>
            )}
            {formatValue(data[hoveredIndex])}
          </div>
        )}
      </div>
    );
  }
);

SparklineWithTooltip.displayName = 'SparklineWithTooltip';

/**
 * TrendIndicator - Mini sparkline with trend arrow
 */
interface TrendIndicatorProps {
  data: number[];
  className?: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ data, className }) => {
  if (!data || data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const isPositive = last >= first;
  const change = ((last - first) / first) * 100;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sparkline
        data={data}
        variant="area"
        color={isPositive ? 'success' : 'error'}
        width={60}
        height={24}
        animated={false}
      />
      <span
        className={cn(
          'text-sm font-medium',
          isPositive ? 'text-status-success' : 'text-status-error'
        )}
      >
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
      </span>
    </div>
  );
};

TrendIndicator.displayName = 'TrendIndicator';

export { Sparkline, SparklineWithTooltip, TrendIndicator };
export type { SparklineProps, SparklineWithTooltipProps };
