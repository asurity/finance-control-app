/**
 * WeeklyPatternChart Component
 * Gráfico de barras mostrando patrones de gasto por día de la semana
 * Optimizado para móvil
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { ResponsiveChart } from '@/presentation/components/shared/Charts/ResponsiveChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';

type WeeklyPatternDatum = {
  dayName: string;
  averagePerDay: number;
  totalExpenses: number;
  transactionCount: number;
  isToday: boolean;
};

interface WeeklyPatternTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: WeeklyPatternDatum;
  }>;
}

function WeeklyPatternTooltipContent({ active, payload }: WeeklyPatternTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
        <p className="font-semibold text-sm flex items-center gap-2">
          {data.dayName}
          {data.isToday && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              Hoy
            </span>
          )}
        </p>
        <div className="text-xs space-y-0.5">
          <p>
            <span className="text-muted-foreground">Promedio/día: </span>
            <span className="font-medium">{formatCurrency(data.averagePerDay)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{formatCurrency(data.totalExpenses)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Transacciones: </span>
            <span className="font-medium">{data.transactionCount}</span>
          </p>
        </div>
      </div>
    );
  }

  return null;
}

interface WeeklyPatternChartProps {
  data: WeeklyPatternDatum[];
  peakDay?: {
    dayName: string;
    amount: number;
  } | null;
}

export function WeeklyPatternChart({ data, peakDay }: WeeklyPatternChartProps) {
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Patrón Semanal</CardTitle>
          <CardDescription className="text-xs sm:text-sm">No hay datos suficientes</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center space-y-2">
            <Calendar className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">Registra transacciones para ver patrones</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Encontrar el máximo para destacarlo
  const maxValue = Math.max(...data.map((d) => d.averagePerDay));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Patrón Semanal</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Promedio de gasto por día
            </CardDescription>
          </div>
          {peakDay && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <div className="text-right">
                <p className="font-semibold text-primary">{peakDay.dayName}</p>
                <p className="text-muted-foreground text-xs">{formatCurrency(peakDay.amount)}</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveChart desktopHeight={250} mobileHeight={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="dayName" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<WeeklyPatternTooltipContent />} />
            <Bar dataKey="averagePerDay" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isToday
                      ? 'hsl(var(--primary))'
                      : entry.averagePerDay === maxValue
                        ? 'hsl(var(--destructive))'
                        : 'hsl(var(--muted-foreground))'
                  }
                  fillOpacity={entry.isToday ? 1 : entry.averagePerDay === maxValue ? 0.8 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveChart>

        {/* Insight text */}
        {peakDay && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">
              💡 <span className="font-medium text-foreground">{peakDay.dayName}</span> es tu día de
              mayor gasto promedio con{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(peakDay.amount)}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader
 */
export function WeeklyPatternChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
          <Skeleton className="h-12 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-12 w-full mt-4" />
      </CardContent>
    </Card>
  );
}
