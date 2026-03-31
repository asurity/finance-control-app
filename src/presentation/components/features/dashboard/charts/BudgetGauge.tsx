/**
 * BudgetGauge Component
 * Gauge semicircular mostrando el porcentaje de presupuesto usado
 * Optimizado para móvil con SVG puro
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { AlertCircle, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';

interface BudgetGaugeProps {
  totalBudget: number;
  totalSpent: number;
  periodName?: string;
  daysRemaining?: number;
}

export function BudgetGauge({
  totalBudget,
  totalSpent,
  periodName = 'Período actual',
  daysRemaining,
}: BudgetGaugeProps) {
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;
  const isOverBudget = percentUsed > 100;

  // Valores para el gauge (0-180 grados, semicírculo)
  const maxAngle = 180;
  const angle = Math.min((percentUsed / 100) * maxAngle, maxAngle);

  // Radio del gauge
  const radius = 80;
  const strokeWidth = 16;
  const centerX = 100;
  const centerY = 100;

  // Calcular path del arco
  const getArcPath = (startAngle: number, endAngle: number, r: number) => {
    const start = polarToCartesian(centerX, centerY, r, endAngle);
    const end = polarToCartesian(centerX, centerY, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Color según porcentaje
  const getColor = () => {
    if (percentUsed > 100) return '#ef4444'; // red-500
    if (percentUsed >= 90) return '#eab308'; // yellow-500
    if (percentUsed >= 70) return '#3b82f6'; // blue-500
    return '#22c55e'; // green-500
  };

  const getStatusIcon = () => {
    if (percentUsed > 100) return <AlertCircle className="h-5 w-5 text-red-600" />;
    if (percentUsed >= 90) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (percentUsed > 100) return 'Presupuesto excedido';
    if (percentUsed >= 90) return 'Cerca del límite';
    if (percentUsed >= 70) return 'Bien encaminado';
    return 'Bajo control';
  };

  if (totalBudget === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Presupuesto del Período</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            No hay presupuesto activo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="text-center space-y-2">
            <TrendingDown className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">Sin presupuesto configurado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Presupuesto del Período</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{periodName}</CardDescription>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent>
        {/* SVG Gauge */}
        <div className="relative flex flex-col items-center">
          <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
            {/* Background arc (gray) */}
            <path
              d={getArcPath(0, 180, radius)}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Progress arc (colored) */}
            <path
              d={getArcPath(0, angle, radius)}
              fill="none"
              stroke={getColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />

            {/* Marcadores de porcentaje */}
            <text x="20" y="105" className="text-xs fill-muted-foreground" fontSize="10">
              0%
            </text>
            <text
              x="90"
              y="25"
              className="text-xs fill-muted-foreground"
              fontSize="10"
              textAnchor="middle"
            >
              50%
            </text>
            <text
              x="170"
              y="105"
              className="text-xs fill-muted-foreground"
              fontSize="10"
              textAnchor="end"
            >
              100%
            </text>
          </svg>

          {/* Center text */}
          <div className="absolute top-12 text-center">
            <p className={`text-2xl sm:text-3xl font-bold ${isOverBudget ? 'text-red-600' : ''}`}>
              {percentUsed.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">usado</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 space-y-3">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Disponible</p>
              <p
                className={`text-sm sm:text-base font-semibold ${
                  remaining < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(Math.abs(remaining))}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Gastado</p>
              <p className="text-sm sm:text-base font-semibold">{formatCurrency(totalSpent)}</p>
            </div>
          </div>

          {/* Days remaining */}
          {daysRemaining !== undefined && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>
                {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
              </span>
            </div>
          )}

          {/* Total budget */}
          <div className="text-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">Presupuesto total</p>
            <p className="text-base sm:text-lg font-bold">{formatCurrency(totalBudget)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader
 */
export function BudgetGaugeSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <Skeleton className="h-32 w-48 rounded-t-full" />
          <Skeleton className="h-8 w-24 mt-4" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
