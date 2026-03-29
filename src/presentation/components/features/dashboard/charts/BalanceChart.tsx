/**
 * Balance Chart Component
 * Line chart showing balance evolution over time
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BalanceChartProps {
  data: Array<{
    date: string;
    balance: number;
    income: number;
    expenses: number;
  }>;
  trend?: 'up' | 'down' | 'stable';
  startBalance?: number;
  endBalance?: number;
}

export function BalanceChart({ data, trend = 'stable', startBalance = 0, endBalance = 0 }: BalanceChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
  };

  const formatYAxis = (value: number) => {
    return formatCurrency(value).replace('CLP', '').trim();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
          <p className="text-sm font-semibold">{formatDate(data.date)}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Balance: </span>
            <span className="font-medium">{formatCurrency(data.balance)}</span>
          </p>
          <p className="text-sm text-green-600">
            <span className="text-muted-foreground">Ingresos: </span>
            <span className="font-medium">{formatCurrency(data.income)}</span>
          </p>
          <p className="text-sm text-red-600">
            <span className="text-muted-foreground">Gastos: </span>
            <span className="font-medium">{formatCurrency(data.expenses)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendText = () => {
    const change = endBalance - startBalance;
    const changePercent = startBalance > 0 ? ((change / startBalance) * 100).toFixed(1) : '0.0';
    const changeFormatted = formatCurrency(Math.abs(change));
    
    if (trend === 'up') {
      return `+${changeFormatted} (${changePercent}%)`;
    } else if (trend === 'down') {
      return `-${changeFormatted} (${changePercent}%)`;
    }
    return 'Sin cambios significativos';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolución del Balance</CardTitle>
            <CardDescription>Balance a lo largo del período seleccionado</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {getTrendText()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis 
              tickFormatter={formatYAxis}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Balance"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(142, 76%, 36%)" 
              strokeWidth={1.5}
              name="Ingresos"
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="hsl(0, 84%, 60%)" 
              strokeWidth={1.5}
              name="Gastos"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BalanceChartSkeleton() {
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
