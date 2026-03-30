/**
 * Period Report Component
 * Shows budget period report with budget vs actual comparison
 */

'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { useCategoryBudgets } from '@/application/hooks/useCategoryBudgets';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useCategories } from '@/application/hooks/useCategories';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { formatCurrencyAbsolute } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PeriodReportProps {
  orgId: string;
  userId: string;
  budgetPeriodId: string;
}

export function PeriodReport({ orgId, userId, budgetPeriodId }: PeriodReportProps) {
  const budgetPeriodsHook = useBudgetPeriods(orgId);
  const categoryBudgetsHook = useCategoryBudgets(orgId);
  const transactionsHook = useTransactions(orgId);
  const categoriesHook = useCategories(orgId);

  // Fetch budget period details
  const { data: budgetPeriod, isLoading: isLoadingPeriod } = budgetPeriodsHook.useBudgetPeriod(budgetPeriodId);

  // Fetch category budgets for this period
  const { data: categoryBudgetsData, isLoading: isLoadingCategoryBudgets } = 
    categoryBudgetsHook.useCategoryBudgetsByPeriod(budgetPeriodId);

  // Fetch period summary
  const { data: periodSummary, isLoading: isLoadingSummary } = 
    categoryBudgetsHook.useBudgetPeriodSummary(budgetPeriodId);

  // Fetch transactions for the period date range
  const { data: periodTransactions = [], isLoading: isLoadingTransactions } = 
    transactionsHook.useTransactionsByDateRange(
      budgetPeriod?.budgetPeriod?.startDate || new Date(),
      budgetPeriod?.budgetPeriod?.endDate || new Date()
    );

  // Fetch all categories
  const { data: allCategories = [] } = categoriesHook.useAllCategories();

  // Calculate income and expenses from transactions
  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!periodTransactions) return { totalIncome: 0, totalExpenses: 0 };

    const income = periodTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome: income, totalExpenses: expenses };
  }, [periodTransactions]);

  // Prepare category budget comparison data
  const categoryComparison = useMemo(() => {
    if (!categoryBudgetsData?.categoryBudgets || !allCategories.length) return [];

    return categoryBudgetsData.categoryBudgets
      .map(cb => {
        const category = allCategories.find(c => c.id === cb.categoryId);
        const spent = cb.spentAmount || 0;
        const budgeted = cb.allocatedAmount || 0;
        const remaining = budgeted - spent;
        const usagePercent = budgeted > 0 ? (spent / budgeted) * 100 : 0;

        let status: 'success' | 'warning' | 'danger' = 'success';
        if (usagePercent > 100) status = 'danger';
        else if (usagePercent > 80) status = 'warning';

        return {
          categoryId: cb.categoryId,
          categoryName: category?.name || 'Sin categoría',
          percentage: cb.percentage || 0,
          budgeted,
          spent,
          remaining,
          usagePercent,
          status,
        };
      })
      .sort((a, b) => b.budgeted - a.budgeted);
  }, [categoryBudgetsData, allCategories]);

  const isLoading = isLoadingPeriod || isLoadingCategoryBudgets || isLoadingSummary || isLoadingTransactions;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!budgetPeriod?.budgetPeriod) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No se encontró el período de presupuesto</p>
        </CardContent>
      </Card>
    );
  }

  const period = budgetPeriod.budgetPeriod;
  const totalBudgeted = period.totalAmount || 0;
  const totalSpent = periodSummary?.totalSpent || 0;
  const budgetBalance = totalBudgeted - totalSpent;
  const realBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Period Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {period.name || 'Período de Presupuesto'}
              </CardTitle>
              <CardDescription>
                {format(period.startDate, "d 'de' MMMM", { locale: es })} - {format(period.endDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </CardDescription>
            </div>
            {period.description && (
              <p className="text-sm text-muted-foreground max-w-md">{period.description}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Presupuesto Total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Presupuesto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyAbsolute(totalBudgeted)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monto asignado al período</p>
          </CardContent>
        </Card>

        {/* Card 2: Total Ejecutado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ejecutado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <MoneyDisplay amount={totalSpent} type="expense" size="lg" />
            </div>
            <Progress value={(totalSpent / totalBudgeted) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {((totalSpent / totalBudgeted) * 100).toFixed(1)}% del presupuesto
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Balance Presupuestario */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Presupuestario</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={budgetBalance} type="balance" size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              {budgetBalance >= 0 ? 'Disponible del presupuesto' : 'Presupuesto excedido'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Balance Real */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Real</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={realBalance} type="balance" size="lg" />
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">Ingresos:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrencyAbsolute(totalIncome)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-muted-foreground">Gastos:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrencyAbsolute(totalExpenses)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Budget vs Actual Table */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto vs Real por Categoría</CardTitle>
          <CardDescription>Comparación de montos presupuestados y ejecutados</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryComparison.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No hay asignaciones de presupuesto para este período
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">% Asignado</TableHead>
                    <TableHead className="text-right">Presupuestado</TableHead>
                    <TableHead className="text-right">Gastado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-32">Uso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryComparison.map((item) => (
                    <TableRow key={item.categoryId}>
                      <TableCell className="font-medium">{item.categoryName}</TableCell>
                      <TableCell className="text-center">{item.percentage.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyAbsolute(item.budgeted)}
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={item.spent} type="expense" size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={item.remaining} type="balance" size="sm" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.status === 'danger' ? 'destructive' :
                            item.status === 'warning' ? 'default' :
                            'secondary'
                          }
                        >
                          {item.status === 'danger' ? 'Excedido' :
                           item.status === 'warning' ? 'Alerta' :
                           'OK'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={Math.min(item.usagePercent, 100)} 
                            className="h-2"
                          />
                          <p className="text-xs text-center text-muted-foreground">
                            {item.usagePercent.toFixed(0)}%
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PeriodReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}
