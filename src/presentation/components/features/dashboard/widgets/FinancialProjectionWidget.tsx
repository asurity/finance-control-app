/**
 * Financial Projection Widget
 * Answers: "Will my money last until the end of the month?"
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  Calendar,
  DollarSign 
} from 'lucide-react';
import { useFinancialProjection } from '../hooks/useFinancialProjection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function FinancialProjectionWidget() {
  const { data: projection, isLoading, error } = useFinancialProjection();

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Proyección Financiera</CardTitle>
          </div>
          <CardDescription>¿Te va a alcanzar hasta fin de mes?</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Calculando proyección...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-200 dark:border-red-900">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle>Proyección Financiera</CardTitle>
          </div>
          <CardDescription>¿Te va a alcanzar hasta fin de mes?</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error al calcular proyección: {error instanceof Error ? error.message : 'Error desconocido'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!projection) {
    return null;
  }

  // Determine styling based on status
  const statusConfig = {
    'excellent': {
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      progressColor: 'bg-green-500',
    },
    'good': {
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      icon: <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-500" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      progressColor: 'bg-blue-500',
    },
    'warning': {
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      progressColor: 'bg-yellow-500',
    },
    'danger': {
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      icon: <XCircle className="w-6 h-6 text-red-600 dark:text-red-500" />,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      progressColor: 'bg-red-500',
    },
    'no-budget': {
      borderColor: 'border-gray-300 dark:border-gray-700',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      icon: <Info className="w-6 h-6 text-gray-600 dark:text-gray-400" />,
      iconBg: 'bg-gray-100 dark:bg-gray-800/30',
      progressColor: 'bg-gray-500',
    },
  };

  const config = statusConfig[projection.status];

  // Handle no-budget status
  if (projection.status === 'no-budget') {
    return (
      <Card className={`border-2 ${config.borderColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Proyección Financiera</CardTitle>
          </div>
          <CardDescription>¿Te va a alcanzar hasta fin de mes?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-start gap-3 p-4 rounded-lg ${config.bgColor}`}>
            <div className={`rounded-full p-2 ${config.iconBg}`}>
              {config.icon}
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm">No hay presupuesto activo</p>
              <p className="text-sm text-muted-foreground">
                Crea un período de presupuesto para ver tu proyección financiera y saber si te alcanzará hasta fin de mes.
              </p>
              <Link href="/budgets">
                <Button size="sm" className="mt-2">
                  Crear Período
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentPeriod, spending, projection: proj } = projection;

  // Calculate budget usage percentage
  const budgetUsage = currentPeriod && currentPeriod.totalBudget > 0
    ? Math.min((spending.totalSpent / currentPeriod.totalBudget) * 100, 100)
    : 0;

  return (
    <Card className={`border-2 ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Proyección Financiera</CardTitle>
          </div>
          {currentPeriod && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{currentPeriod.daysRemaining} días restantes</span>
            </div>
          )}
        </div>
        <CardDescription>¿Te va a alcanzar hasta fin de mes?</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Message */}
        <div className={`flex items-start gap-3 p-4 rounded-lg ${config.bgColor}`}>
          <div className={`rounded-full p-2 ${config.iconBg}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="font-medium">{projection.message}</p>
          </div>
        </div>

        {/* Safe to Spend Today */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Puedes gastar hoy</span>
            </div>
            <MoneyDisplay 
              amount={proj.safeToSpendToday} 
              type={proj.safeToSpendToday > 0 ? 'balance' : 'neutral'}
              className="text-lg font-bold"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {proj.safeToSpendToday > 0 
              ? 'Presupuesto diario recomendado para llegar a fin de mes'
              : 'Has excedido el presupuesto del período'}
          </p>
        </div>

        {/* Budget Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Presupuesto usado</span>
            <span className="font-medium">{budgetUsage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={budgetUsage} 
            className="h-3"
            indicatorClassName={config.progressColor}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Gastado: <MoneyDisplay amount={spending.totalSpent} type="expense" size="sm" />
            </span>
            {currentPeriod && (
              <span>
                Total: <MoneyDisplay amount={currentPeriod.totalBudget} type="neutral" size="sm" />
              </span>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Promedio diario</p>
            <MoneyDisplay 
              amount={spending.dailyAverageSpent} 
              type="expense" 
              size="sm"
              className="font-medium"
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Presupuesto diario ideal</p>
            <MoneyDisplay 
              amount={spending.dailyBudgetRemaining} 
              type="neutral" 
              size="sm"
              className="font-medium"
            />
          </div>
        </div>

        {/* Day budget runs out warning */}
        {proj.dayBudgetRunsOut && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Día estimado sin presupuesto: <strong>{new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' }).format(proj.dayBudgetRunsOut)}</strong>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
