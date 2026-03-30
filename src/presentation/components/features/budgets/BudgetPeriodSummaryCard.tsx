/**
 * BudgetPeriodSummaryCard Component
 * Summary card showing consolidated metrics for a budget period
 */

import { useMemo } from 'react';
import { TrendingUp, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';
import { formatCurrency } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BudgetPeriodSummaryCardProps {
  budgetPeriod: BudgetPeriod;
  categoryBudgets: CategoryBudget[];
}

interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  allocationPercentage: number;
  spentPercentage: number;
  exceededCategories: number;
  approachingLimitCategories: number;
}

export function BudgetPeriodSummaryCard({
  budgetPeriod,
  categoryBudgets,
}: BudgetPeriodSummaryCardProps) {
  const summary: BudgetSummary = useMemo(() => {
    const totalBudget = budgetPeriod.totalAmount;
    const totalAllocated = categoryBudgets.reduce((sum, cb) => sum + cb.allocatedAmount, 0);
    const totalSpent = categoryBudgets.reduce((sum, cb) => sum + cb.spentAmount, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const allocationPercentage = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0;
    const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const exceededCategories = categoryBudgets.filter((cb) => cb.isExceeded()).length;
    const approachingLimitCategories = categoryBudgets.filter(
      (cb) => cb.isApproachingLimit() && !cb.isExceeded()
    ).length;

    return {
      totalBudget,
      totalAllocated,
      totalSpent,
      totalRemaining,
      allocationPercentage,
      spentPercentage,
      exceededCategories,
      approachingLimitCategories,
    };
  }, [budgetPeriod, categoryBudgets]);

  const daysRemaining = budgetPeriod.getRemainingDays();
  const timeProgress = budgetPeriod.getTimeProgressPercentage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Resumen del Período
        </CardTitle>
        <CardDescription>
          {budgetPeriod.name || 'Período de presupuesto activo'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grid de métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Presupuesto Total</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Asignado</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalAllocated)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.allocationPercentage.toFixed(1)}% del total
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Gastado</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalSpent)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.spentPercentage.toFixed(1)}% del asignado
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className={`text-2xl font-bold ${summary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(summary.totalRemaining))}
            </p>
            {summary.totalRemaining < 0 && (
              <p className="text-xs text-red-600 font-medium">Excedido</p>
            )}
          </div>
        </div>

        {/* Progress bar general del período */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso del gasto</span>
            <span className="font-medium">{summary.spentPercentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={Math.min(summary.spentPercentage, 100)} 
            className={summary.spentPercentage > 100 ? 'bg-red-100' : undefined}
          />
        </div>

        {/* Información temporal */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {daysRemaining > 0 
                ? `${daysRemaining} días restantes` 
                : budgetPeriod.hasExpired() 
                  ? 'Período expirado' 
                  : 'Período aún no iniciado'}
            </p>
            <Progress value={timeProgress} className="h-1 mt-1" />
          </div>
          <Badge variant={budgetPeriod.isActive() ? 'default' : 'secondary'}>
            {budgetPeriod.isActive() 
              ? 'Activo' 
              : budgetPeriod.hasExpired() 
                ? 'Expirado' 
                : 'Próximo'}
          </Badge>
        </div>

        {/* Alertas de categorías */}
        {(summary.exceededCategories > 0 || summary.approachingLimitCategories > 0) && (
          <div className="space-y-2 pt-2 border-t">
            {summary.exceededCategories > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{summary.exceededCategories}</strong> {summary.exceededCategories === 1 ? 'categoría ha' : 'categorías han'} excedido su presupuesto
                </AlertDescription>
              </Alert>
            )}
            {summary.approachingLimitCategories > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{summary.approachingLimitCategories}</strong> {summary.approachingLimitCategories === 1 ? 'categoría está' : 'categorías están'} cerca del límite (≥80%)
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
