/**
 * Period Balance Chart
 * Line chart showing accumulated income and expenses over time
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ResponsiveChart } from '@/presentation/components/shared/Charts/ResponsiveChart';
import { formatCurrencyAbsolute } from '@/lib/utils/format';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyAccumulation } from '@/domain/use-cases/dashboard/GetDashboardStatisticsUseCase';

interface PeriodBalanceChartProps {
  data: DailyAccumulation[];
  period: 'week' | 'month' | 'quarter' | 'year';
}

export function PeriodBalanceChart({ data, period }: PeriodBalanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No hay datos disponibles para este periodo</p>
      </div>
    );
  }

  // Format data for chart (use positive values for both lines)
  // Add error handling for invalid dates
  const chartData = data
    .map((item) => {
      try {
        const parsedDate = parseISO(item.date);
        // Validate date is valid
        if (isNaN(parsedDate.getTime())) {
          console.error('Invalid date in dailyAccumulations:', item.date);
          return null;
        }
        return {
          date: item.date,
          dateFormatted: format(parsedDate, 'd MMM', { locale: es }),
          ingresos: item.accumulatedIncome,
          gastos: item.accumulatedExpenses,
        };
      } catch (error) {
        console.error('Error formatting date:', item.date, error);
        return null;
      }
    })
    .filter((item) => item !== null);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Error al cargar los datos del periodo</p>
      </div>
    );
  }

  // Determine tick interval based on period
  const getTickInterval = () => {
    const dataLength = chartData.length;
    if (period === 'week') return 0; // Show all days for week
    if (period === 'month') return Math.ceil(dataLength / 6); // ~6 ticks
    if (period === 'quarter') return Math.ceil(dataLength / 8); // ~8 ticks
    if (period === 'year') return Math.ceil(dataLength / 12); // ~12 ticks
    return Math.ceil(dataLength / 10);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      try {
        // Get the original date from the payload data
        const dateStr = payload[0].payload.date; // ISO format from data
        const date = parseISO(dateStr);
        
        // Validate date before formatting
        if (isNaN(date.getTime())) {
          return null;
        }
        
        const formattedDate = format(date, "EEEE d 'de' MMMM", { locale: es });

        return (
          <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
            <p className="text-xs font-semibold capitalize">{formattedDate}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-xs text-muted-foreground">Ingresos acumulados:</span>
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  {formatCurrencyAbsolute(payload[0].value)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-xs text-muted-foreground">Gastos acumulados:</span>
                </div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  {formatCurrencyAbsolute(payload[1].value)}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground font-semibold">Balance:</span>
                  <span
                    className={`text-xs font-bold ${
                      payload[0].value - payload[1].value >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrencyAbsolute(payload[0].value - payload[1].value)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        console.error('Error rendering tooltip:', error);
        return null;
      }
    }
    return null;
  };

  return (
    <ResponsiveChart desktopHeight={300} mobileHeight={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="dateFormatted"
          tick={{ fontSize: 12 }}
          interval={getTickInterval()}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value) => {
            if (value === 'ingresos') return 'Ingresos Acumulados';
            if (value === 'gastos') return 'Gastos Acumulados';
            return value;
          }}
        />
        <Line
          type="monotone"
          dataKey="ingresos"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name="ingresos"
        />
        <Line
          type="monotone"
          dataKey="gastos"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name="gastos"
        />
      </LineChart>
    </ResponsiveChart>
  );
}

/**
 * Skeleton variant for loading state
 */
export function PeriodBalanceChartSkeleton() {
  return (
    <div className="h-[300px] animate-pulse">
      <div className="h-full w-full bg-muted rounded-md" />
    </div>
  );
}
