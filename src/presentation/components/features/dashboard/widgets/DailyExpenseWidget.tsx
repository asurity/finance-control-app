/**
 * Daily Expense Widget
 * Shows today's spending with budget comparison, pie chart, and transaction list
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { Progress } from '@/components/ui/progress';
import { Calendar, TrendingDown, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyWeeklyStats } from '@/domain/use-cases/dashboard/GetDailyWeeklyStatsUseCase';
import { TodayExpensesPieChart } from './TodayExpensesPieChart';
import { Button } from '@/components/ui/button';

interface DailyExpenseWidgetProps {
  stats: DailyWeeklyStats;
  date?: Date;
}

export function DailyExpenseWidget({ stats, date = new Date() }: DailyExpenseWidgetProps) {
  const { today, dailyBudget, todayVsBudget } = stats;
  const [showTransactions, setShowTransactions] = useState(false);

  const budgetProgress =
    dailyBudget && dailyBudget > 0 ? Math.min((today.totalExpenses / dailyBudget) * 100, 100) : 0;

  // Color coding based on budget usage
  let progressColor = 'bg-green-500';
  let statusText = 'Dentro del presupuesto';

  if (todayVsBudget === 'over') {
    progressColor = 'bg-red-500';
    statusText = 'Sobre presupuesto';
  } else if (budgetProgress >= 80 && todayVsBudget === 'under') {
    progressColor = 'bg-yellow-500';
    statusText = 'Cerca del límite';
  }

  const dateFormatted = format(date, "EEEE d 'de' MMMM", { locale: es });

  // Filter only expense transactions for the list
  const expenseTransactions = today.transactions.filter((t) => t.type === 'EXPENSE');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Hoy</CardTitle>
          </div>
          <TrendingDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription className="capitalize">{dateFormatted}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main expense amount */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total gastado</p>
          <MoneyDisplay
            amount={today.totalExpenses}
            type="expense"
            size="xl"
            className="font-bold"
          />
        </div>

        {/* Budget progress bar */}
        {dailyBudget && dailyBudget > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{statusText}</span>
              <span className="font-medium">{budgetProgress.toFixed(0)}%</span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Presupuesto diario:</span>
              <MoneyDisplay amount={dailyBudget} type="neutral" size="sm" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <span>Sin presupuesto activo</span>
          </div>
        )}

        {/* Pie chart - Expenses by category */}
        {today.expensesByCategory.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Gastos por categoría</p>
            <TodayExpensesPieChart
              data={today.expensesByCategory}
              totalExpenses={today.totalExpenses}
            />
          </div>
        )}

        {/* Transaction count with expandable list */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
            onClick={() => setShowTransactions(!showTransactions)}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span>
                {today.transactionCount}{' '}
                {today.transactionCount === 1 ? 'transacción' : 'transacciones'} hoy
              </span>
            </div>
            {showTransactions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {/* Transaction list */}
          {showTransactions && expenseTransactions.length > 0 && (
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
              {expenseTransactions.map((transaction) => {
                // Find category name
                const category = today.expensesByCategory.find(
                  (cat) => cat.categoryId === transaction.categoryId
                );

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{transaction.description}</p>
                      {category && (
                        <p className="text-xs text-muted-foreground">{category.categoryName}</p>
                      )}
                    </div>
                    <MoneyDisplay
                      amount={transaction.amount}
                      type="expense"
                      size="sm"
                      className="ml-2"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {showTransactions && expenseTransactions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">No hay gastos hoy</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton variant for loading state
 */
export function DailyExpenseWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="w-16 h-5 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-48 h-4 bg-muted rounded animate-pulse mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="w-24 h-3 bg-muted rounded animate-pulse mb-2" />
          <div className="w-32 h-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="w-full h-2 bg-muted rounded animate-pulse" />
          <div className="w-full h-3 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-full h-4 bg-muted rounded animate-pulse pt-2 border-t" />
      </CardContent>
    </Card>
  );
}
