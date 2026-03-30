/**
 * Expenses By Category Chart Component
 * Pie chart showing expense distribution by category
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  'hsl(0, 84%, 60%)',     // Red
  'hsl(24, 95%, 53%)',    // Orange
  'hsl(45, 93%, 47%)',    // Yellow
  'hsl(142, 76%, 36%)',   // Green
  'hsl(210, 92%, 45%)',   // Blue
  'hsl(271, 76%, 53%)',   // Purple
  'hsl(335, 78%, 42%)',   // Pink
  'hsl(180, 77%, 34%)',   // Teal
];

export function ExpensesByCategoryChart({ data, totalExpenses }: ExpensesByCategoryChartProps) {
  // Take top 8 categories and group the rest as "Otros"
  const topCategories = data.slice(0, 7);
  const otherCategories = data.slice(7);
  
  let chartData = topCategories.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.amount,
    percentage: cat.percentage,
    count: cat.transactionCount,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
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
      color: 'hsl(var(--muted-foreground))',
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
          <p className="text-sm font-semibold">{data.name}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Monto: </span>
            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrencyAbsolute(data.value)}</span>
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
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
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
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>
          Distribución de {formatCurrencyAbsolute(totalExpenses)} en gastos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
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
              height={36}
              formatter={(value, entry: any) => {
                const data = entry.payload;
                return `${value} (${data.percentage.toFixed(1)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Top Categories List */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold">Top Categorías</h4>
          <div className="space-y-2">
            {topCategories.slice(0, 3).map((cat, index) => (
              <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.color || DEFAULT_COLORS[index] }}
                  />
                  <span>{cat.categoryName}</span>
                </div>
                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrencyAbsolute(cat.amount)}</span>
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
