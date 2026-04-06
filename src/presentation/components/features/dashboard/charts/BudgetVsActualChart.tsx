/**
 * BudgetVsActualChart Component
 * Gráfico de barras horizontales comparando presupuesto vs gasto real por categoría
 * Optimizado para vista móvil
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { useResponsive } from '@/hooks/useResponsive';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';

type BudgetVsActualDatum = {
  categoryName: string;
  budgeted: number;
  spent: number;
  percentUsed: number;
  color: string;
  status: 'under' | 'at-limit' | 'over';
};

interface BudgetVsActualTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: BudgetVsActualDatum;
  }>;
}

function BudgetVsActualTooltipContent({ active, payload }: BudgetVsActualTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
        <p className="font-semibold text-sm">{data.categoryName}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Presupuesto:</span>
            <span className="font-medium">{formatCurrency(data.budgeted)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gastado:</span>
            <span
              className={`font-medium ${
                data.status === 'over'
                  ? 'text-red-600'
                  : data.status === 'at-limit'
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {formatCurrency(data.spent)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Disponible:</span>
            <span className={`font-medium ${data.budgeted - data.spent < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(data.budgeted - data.spent)}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t">
            <span className="text-muted-foreground">Uso:</span>
            <span
              className={`font-bold ${
                data.percentUsed > 100
                  ? 'text-red-600'
                  : data.percentUsed >= 90
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {data.percentUsed.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

interface BudgetVsActualChartProps {
  data: BudgetVsActualDatum[];
  totalBudget?: number;
  totalSpent?: number;
}

export function BudgetVsActualChart({
  data,
  totalBudget = 0,
  totalSpent = 0,
}: BudgetVsActualChartProps) {
  const { isMobile } = useResponsive();
  const formatYAxis = (value: string) => {
    // Truncar nombres largos en móvil
    return value.length > 12 ? value.substring(0, 12) + '...' : value;
  };

  const formatXAxis = (value: number) => {
    // Formato compacto para móvil
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const overBudgetCount = data.filter((d) => d.status === 'over').length;
  const atLimitCount = data.filter((d) => d.status === 'at-limit').length;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto vs Real</CardTitle>
          <CardDescription>No hay datos de presupuesto disponibles</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center space-y-2">
            <p>No hay período de presupuesto activo</p>
            <p className="text-sm">Crea un presupuesto para ver esta comparación</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Presupuesto vs Real</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Comparación por categoría
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 text-xs sm:text-sm">
            {overBudgetCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3 w-3" />
                <span>{overBudgetCount} sobre límite</span>
              </div>
            )}
            {atLimitCount > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{atLimitCount} en límite</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumen total - Mobile friendly */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total Presupuestado</p>
            <p className="text-sm sm:text-base font-semibold">{formatCurrency(totalBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Gastado</p>
            <p
              className={`text-sm sm:text-base font-semibold ${
                totalSpent > totalBudget ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>

        {/* Chart - Responsive height */}
        <ResponsiveContainer width="100%" height={Math.max(isMobile ? 220 : 300, data.length * (isMobile ? 40 : 50))}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: isMobile ? 10 : 30, left: isMobile ? 40 : 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={formatXAxis} />
            <YAxis dataKey="categoryName" type="category" width={75} tickFormatter={formatYAxis} />
            <Tooltip content={<BudgetVsActualTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />

            {/* Barra de presupuesto (fondo) */}
            <Bar dataKey="budgeted" fill="#cbd5e1" name="Presupuesto" radius={[0, 4, 4, 0]} />

            {/* Barra de gasto real (color según estado) */}
            <Bar dataKey="spent" name="Gastado" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => {
                let color = '#22c55e'; // green-500
                if (entry.status === 'over') {
                  color = '#ef4444'; // red-500
                } else if (entry.status === 'at-limit') {
                  color = '#eab308'; // yellow-500
                }
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend mobile - Status indicators */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Bajo control (&lt;90%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">En límite (90-100%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Excedido (&gt;100%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader
 */
export function BudgetVsActualChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
