/**
 * Weekly Expense Widget
 * Shows this week's spending with comparison to last week
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyWeeklyStats } from '@/domain/use-cases/dashboard/GetDailyWeeklyStatsUseCase';

interface WeeklyExpenseWidgetProps {
  stats: DailyWeeklyStats;
  date?: Date;
}

export function WeeklyExpenseWidget({ stats, date = new Date() }: WeeklyExpenseWidgetProps) {
  const { thisWeek, lastWeek } = stats;

  // Calculate change percentage
  const changeAmount = thisWeek.totalExpenses - lastWeek.totalExpenses;
  const changePercent =
    lastWeek.totalExpenses > 0 ? (changeAmount / lastWeek.totalExpenses) * 100 : 0;

  const isIncrease = changeAmount > 0;
  const ChangeIcon = isIncrease ? ArrowUp : ArrowDown;
  const changeColor = isIncrease ? 'text-red-500' : 'text-green-500';

  // Format week range
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM', { locale: es })}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Esta semana</CardTitle>
          </div>
          <TrendingDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription>{weekRange}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main expense amount */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total gastado</p>
          <MoneyDisplay
            amount={thisWeek.totalExpenses}
            type="expense"
            size="xl"
            className="font-bold"
          />
        </div>

        {/* Comparison with last week */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Semana pasada:</span>
            <MoneyDisplay amount={lastWeek.totalExpenses} type="neutral" size="sm" />
          </div>
          {lastWeek.totalExpenses > 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
              <ChangeIcon className="w-3 h-3" />
              <span>{Math.abs(changePercent).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Daily average */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-4 h-4" />
            <span>Promedio diario</span>
          </div>
          <MoneyDisplay
            amount={thisWeek.dailyAverage}
            type="expense"
            size="sm"
            className="font-medium"
          />
        </div>

        {/* Income info */}
        {thisWeek.totalIncome > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Ingresos</span>
            </div>
            <MoneyDisplay
              amount={thisWeek.totalIncome}
              type="income"
              size="sm"
              className="font-medium"
            />
          </div>
        )}

        {/* Transaction count */}
        <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
          <Receipt className="w-4 h-4" />
          <span>
            {thisWeek.transactionCount}{' '}
            {thisWeek.transactionCount === 1 ? 'transacción' : 'transacciones'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton variant for loading state
 */
export function WeeklyExpenseWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="w-24 h-5 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-40 h-4 bg-muted rounded animate-pulse mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="w-24 h-3 bg-muted rounded animate-pulse mb-2" />
          <div className="w-32 h-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-full h-12 bg-muted rounded animate-pulse" />
        <div className="w-full h-4 bg-muted rounded animate-pulse" />
        <div className="w-full h-4 bg-muted rounded animate-pulse pt-2 border-t" />
      </CardContent>
    </Card>
  );
}
