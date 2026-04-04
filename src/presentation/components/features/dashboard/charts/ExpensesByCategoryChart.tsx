/**
 * Expenses By Category Chart Component
 * Pie chart showing expense distribution by category
 */

'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ResponsiveChart } from '@/presentation/components/shared/Charts/ResponsiveChart';
import { formatCurrencyAbsolute } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpensesByCategoryChartProps {
  data: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    color?: string;
  }>;
  totalExpenses: number;
}

// Default color palette for categories without colors
const DEFAULT_COLORS = [
  'hsl(0, 84%, 60%)', // Red
  'hsl(24, 95%, 53%)', // Orange
  'hsl(45, 93%, 47%)', // Yellow
  'hsl(142, 76%, 36%)', // Green
  'hsl(210, 92%, 45%)', // Blue
  'hsl(271, 76%, 53%)', // Purple
  'hsl(335, 78%, 42%)', // Pink
  'hsl(180, 77%, 34%)', // Teal
];

export function ExpensesByCategoryChart({ data, totalExpenses }: ExpensesByCategoryChartProps) {
  // Show all categories without grouping
  const chartData = data.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.amount,
    percentage: cat.percentage,
    count: cat.transactionCount,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
          <p className="text-sm font-semibold">{data.name}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Monto: </span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatCurrencyAbsolute(data.value)}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Porcentaje: </span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Transacciones: </span>
            <span className="font-medium">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for very small slices

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
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría en el Periodo</CardTitle>
          <CardDescription>Distribución de gastos en el período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No hay datos de gastos en este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoría en el Periodo</CardTitle>
        <CardDescription>
          Distribución de {formatCurrencyAbsolute(totalExpenses)} en gastos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveChart desktopHeight={250} mobileHeight={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={75}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconSize={10}
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value, entry: any) => {
                const data = entry.payload;
                return `${value} (${data.percentage.toFixed(1)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveChart>

        {/* All Categories Table */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold">Todas las Categorías</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.map((cat, index) => (
              <div key={cat.categoryId} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                  />
                  <span className="flex-1">{cat.categoryName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-red-600 dark:text-red-400 min-w-[100px] text-right">
                    {formatCurrencyAbsolute(cat.amount)}
                  </span>
                  <span className="text-muted-foreground min-w-[50px] text-right">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpensesByCategoryChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
