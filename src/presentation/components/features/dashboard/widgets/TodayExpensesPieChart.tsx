/**
 * Today Expenses Pie Chart
 * Mini pie chart showing today's expense distribution by category
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrencyAbsolute } from '@/lib/utils/format';
import type { TodayCategoryExpense } from '@/domain/use-cases/dashboard/GetDailyWeeklyStatsUseCase';

interface TodayExpensesPieChartProps {
  data: TodayCategoryExpense[];
  totalExpenses: number;
}

// Fallback color for categories without color (should rarely be used)
const FALLBACK_COLOR = '#999999';

export function TodayExpensesPieChart({ data, totalExpenses }: TodayExpensesPieChartProps) {
  // Take top 5 categories and group the rest as "Otros"
  const topCategories = data.slice(0, 5);
  const otherCategories = data.slice(5);

  // Map categories using their defined colors from the budgets/categories section
  let chartData = topCategories.map((cat) => ({
    name: cat.categoryName,
    value: cat.amount,
    percentage: cat.percentage,
    count: cat.transactionCount,
    // Use the category color defined in the system (from budgets section)
    color: cat.color || FALLBACK_COLOR,
  }));

  if (otherCategories.length > 0) {
    const otherAmount = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const otherPercentage = (otherAmount / totalExpenses) * 100;
    const otherCount = otherCategories.reduce((sum, cat) => sum + cat.transactionCount, 0);

    chartData.push({
      name: 'Otros',
      value: otherAmount,
      percentage: otherPercentage,
      count: otherCount,
      color: '#95A5A6', // Gray color for "Others" category
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-2 space-y-0.5">
          <p className="text-xs font-semibold">{data.name}</p>
          <p className="text-xs">
            <span className="text-muted-foreground">Monto: </span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatCurrencyAbsolute(data.value)}
            </span>
          </p>
          <p className="text-xs">
            <span className="text-muted-foreground">Porcentaje: </span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null; // Don't show label for very small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[10px] font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[160px] flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Sin gastos hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={55}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend - Category Labels with colors from category definitions */}
      <div className="space-y-1.5">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Color indicator using the category's defined color */}
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {formatCurrencyAbsolute(entry.value)}
              </span>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {entry.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
