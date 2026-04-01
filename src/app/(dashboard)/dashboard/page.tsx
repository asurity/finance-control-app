'use client';

/**
 * Dashboard Page
 * Main dashboard with real-time KPIs and metrics
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useDashboardStats } from '@/presentation/components/features/dashboard/hooks/useDashboardStats';
import { useBalanceHistory } from '@/presentation/components/features/dashboard/hooks/useBalanceHistory';
import { useExpensesByCategory } from '@/presentation/components/features/dashboard/hooks/useExpensesByCategory';
import { useRecentTransactions } from '@/presentation/components/features/dashboard/hooks/useRecentTransactions';
import { useUnreadAlerts } from '@/presentation/components/features/dashboard/hooks/useUnreadAlerts';
import { useDailyWeeklyStats } from '@/presentation/components/features/dashboard/hooks/useDailyWeeklyStats';
import { useBudgetVsActual } from '@/presentation/components/features/dashboard/hooks/useBudgetVsActual';
import { useWeeklyPattern } from '@/presentation/components/features/dashboard/hooks/useWeeklyPattern';
import { useRecurringTransactions } from '@/application/hooks/useRecurringTransactions';
import { KPICard, KPICardSkeleton } from '@/presentation/components/shared/Cards/KPICard';
import {
  BalanceChart,
  BalanceChartSkeleton,
} from '@/presentation/components/features/dashboard/charts/BalanceChart';
import {
  ExpensesByCategoryChart,
  ExpensesByCategoryChartSkeleton,
} from '@/presentation/components/features/dashboard/charts/ExpensesByCategoryChart';
import {
  BudgetVsActualChart,
  BudgetVsActualChartSkeleton,
} from '@/presentation/components/features/dashboard/charts/BudgetVsActualChart';
import {
  WeeklyPatternChart,
  WeeklyPatternChartSkeleton,
} from '@/presentation/components/features/dashboard/charts/WeeklyPatternChart';
import {
  BudgetGauge,
  BudgetGaugeSkeleton,
} from '@/presentation/components/features/dashboard/charts/BudgetGauge';
import {
  RecentTransactionsWidget,
  RecentTransactionsWidgetSkeleton,
} from '@/presentation/components/features/dashboard/widgets/RecentTransactionsWidget';
import { DebtSummaryWidget } from '@/presentation/components/features/dashboard/widgets/DebtSummaryWidget';
import { FinancialProjectionWidget } from '@/presentation/components/features/dashboard/widgets/FinancialProjectionWidget';
import { RecurringCommitmentsWidget } from '@/presentation/components/features/dashboard/widgets/RecurringCommitmentsWidget';
import { SavingsGoalsWidget } from '@/presentation/components/features/dashboard/widgets/SavingsGoalsWidget';
import {
  AlertsWidget,
  AlertsWidgetSkeleton,
} from '@/presentation/components/features/dashboard/widgets/AlertsWidget';
import {
  DailyExpenseWidget,
  DailyExpenseWidgetSkeleton,
} from '@/presentation/components/features/dashboard/widgets/DailyExpenseWidget';
import {
  WeeklyExpenseWidget,
  WeeklyExpenseWidgetSkeleton,
} from '@/presentation/components/features/dashboard/widgets/WeeklyExpenseWidget';
import { formatCurrency, formatCurrencyAbsolute } from '@/lib/utils/format';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Bell,
  PieChart,
  AlertCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { PeriodStatusBanner } from '@/presentation/components/features/budgets/PeriodStatusBanner';
import { OnboardingWizard } from '@/presentation/components/features/onboarding/OnboardingWizard';
import { useAccounts } from '@/application/hooks/useAccounts';

type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year';

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const { data: stats, isLoading, error, refetch, isFetching } = useDashboardStats(period);
  const { data: balanceHistory, isLoading: isLoadingBalance } = useBalanceHistory(period);
  const { data: expensesByCategory, isLoading: isLoadingExpenses } = useExpensesByCategory(period);
  const { data: recentTransactions, isLoading: isLoadingTransactions } = useRecentTransactions(5);
  const { data: unreadAlerts, isLoading: isLoadingAlerts } = useUnreadAlerts(3);
  const { data: dailyWeeklyStats, isLoading: isLoadingDailyWeekly } = useDailyWeeklyStats();

  // New hooks for Phase 07 charts
  const budgetVsActual = useBudgetVsActual(currentOrgId || '');

  // Calculate date range for weekly pattern based on selected period
  const periodDates = useMemo(() => {
    const now = new Date();
    const end = now;
    let start: Date;
    switch (period) {
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    return { startDate: start, endDate: end };
  }, [period]);

  const weeklyPattern = useWeeklyPattern(
    currentOrgId || '',
    periodDates.startDate,
    periodDates.endDate
  );
  const balanceSparkline = balanceHistory?.dataPoints.map((point) => point.balance) ?? [];
  const incomeSparkline = balanceHistory?.dataPoints.map((point) => point.income) ?? [];
  const expensesSparkline = balanceHistory?.dataPoints.map((point) => point.expenses) ?? [];

  // Recurring transactions hook for Phase 09
  const recurringHook = useRecurringTransactions(currentOrgId || '', user?.id || '');
  const { mutate: processRecurring } = recurringHook.processRecurringTransaction;

  // Onboarding detection
  const [showOnboarding, setShowOnboarding] = useState(false);
  const accountsHook = useAccounts(currentOrgId || '');
  const { data: allAccounts, isLoading: isLoadingAccounts } = accountsHook.useAllAccounts();

  useEffect(() => {
    if (!user?.id || isLoadingAccounts) return;
    // If user has no accounts, check if onboarding was already completed
    if (allAccounts && allAccounts.length === 0) {
      const checkOnboarding = async () => {
        try {
          const settingsDoc = await getDoc(doc(db, `userSettings/${user.id}`));
          if (!settingsDoc.exists() || !settingsDoc.data()?.onboardingCompleted) {
            setShowOnboarding(true);
          }
        } catch {
          // If we can't read settings, show onboarding for new users
          setShowOnboarding(true);
        }
      };
      checkOnboarding();
    }
  }, [user?.id, allAccounts, isLoadingAccounts]);

  // Automatic processing of recurring transactions on dashboard load
  useEffect(() => {
    if (currentOrgId && user?.id) {
      // Process recurring transactions silently in the background
      processRecurring('', {
        onError: (error) => {
          console.error('Error processing recurring transactions:', error);
          // Don't show toast on error, just log it
        },
      });
    }
  }, [currentOrgId, user?.id]);

  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await refetch();
      toast.success('Dashboard actualizado');
    } catch (error) {
      toast.error('Error al actualizar dashboard', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week':
        return 'Esta semana';
      case 'month':
        return 'Este mes';
      case 'quarter':
        return 'Este trimestre';
      case 'year':
        return 'Este año';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center max-w-lg">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar el dashboard</h3>
          <div className="text-sm text-muted-foreground mb-4 space-y-2">
            <p className="font-medium">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <div className="text-xs bg-muted p-3 rounded-md text-left">
              <p>
                <strong>Usuario:</strong> {user?.email || 'No autenticado'}
              </p>
              <p>
                <strong>User ID:</strong> {user?.id || 'N/A'}
              </p>
              <p>
                <strong>Org ID:</strong> {currentOrgId || 'No establecida'}
              </p>
              <p>
                <strong>Período:</strong> {period}
              </p>
            </div>
            <p className="text-xs italic">
              Revisa la consola del navegador (F12) para más detalles
            </p>
          </div>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Onboarding Wizard */}
      {showOnboarding && currentOrgId && user?.id && (
        <OnboardingWizard
          orgId={currentOrgId}
          userId={user.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <PeriodStatusBanner />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de tu situación financiera - {getPeriodLabel()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value) => setPeriod(value as DashboardPeriod)}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Daily & Weekly Widgets - Immediate Information */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {isLoadingDailyWeekly || !dailyWeeklyStats ? (
          <>
            <DailyExpenseWidgetSkeleton />
            <WeeklyExpenseWidgetSkeleton />
          </>
        ) : (
          <>
            <DailyExpenseWidget stats={dailyWeeklyStats} />
            <WeeklyExpenseWidget stats={dailyWeeklyStats} />
          </>
        )}
      </div>

      {/* Balance del Período - Card Destacado */}
      {isLoading || !stats ? (
        <KPICardSkeleton />
      ) : (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Balance del Período</h3>
              <div className="flex items-baseline gap-3">
                <MoneyDisplay
                  amount={(stats.totalIncome || 0) - (stats.totalExpenses || 0)}
                  type="balance"
                  size="xl"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {(stats.totalIncome || 0) - (stats.totalExpenses || 0) >= 0
                  ? '🎉 Estás ahorrando este período'
                  : '⚠️ Estás gastando más de lo que ganas este período'}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">Ingresos:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrencyAbsolute(stats.totalIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span className="text-muted-foreground">Gastos:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {formatCurrencyAbsolute(stats.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Financial Projection Widget */}
      <FinancialProjectionWidget />

      {/* KPIs Grid - Primary Row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5">
        {/* KPI 1: Balance Total */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Balance Total"
            value={formatCurrency(stats.currentBalance)}
            valueClassName={
              stats.currentBalance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
            change={stats.monthlyChangePercent}
            changeType={
              stats.monthlyChange > 0
                ? 'positive'
                : stats.monthlyChange < 0
                  ? 'negative'
                  : 'neutral'
            }
            icon={<DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            sparklineData={balanceSparkline}
          />
        )}

        {/* KPI 2: Ingresos del Período */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title={`Ingresos ${period === 'week' ? 'de la Semana' : period === 'month' ? 'del Mes' : period === 'quarter' ? 'del Trimestre' : 'del Año'}`}
            value={formatCurrency(stats.totalIncome)}
            valueClassName="text-green-600 dark:text-green-400"
            icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />}
            description={`${stats.transactionCounts.income} transacciones`}
            sparklineData={incomeSparkline}
          />
        )}

        {/* KPI 3: Gastos del Período */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title={`Gastos ${period === 'week' ? 'de la Semana' : period === 'month' ? 'del Mes' : period === 'quarter' ? 'del Trimestre' : 'del Año'}`}
            value={formatCurrencyAbsolute(stats.totalExpenses)}
            valueClassName="text-red-600 dark:text-red-400"
            icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />}
            description={`${stats.transactionCounts.expense} transacciones`}
            sparklineData={expensesSparkline}
          />
        )}

        {/* KPI 4: Tasa de Ahorro */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Tasa de Ahorro"
            value={`${stats.savingsRate.toFixed(1)}%`}
            changeType={
              stats.savingsRate > 20 ? 'positive' : stats.savingsRate > 10 ? 'neutral' : 'negative'
            }
            icon={<Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            description={
              stats.savingsRate > 20
                ? '¡Excelente tasa de ahorro!'
                : stats.savingsRate > 10
                  ? 'Buena tasa de ahorro'
                  : 'Considera aumentar tus ahorros'
            }
          />
        )}
      </div>

      {/* KPIs Grid - Secondary Row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI 5: Pagos Pendientes */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Pagos Pendientes"
            value={stats.pendingPayments}
            icon={<CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            changeType={stats.pendingPayments > 0 ? 'neutral' : 'positive'}
            description={
              stats.pendingPayments === 0
                ? 'Sin pagos pendientes'
                : stats.pendingPayments === 1
                  ? '1 pago próximo'
                  : `${stats.pendingPayments} pagos próximos`
            }
          />
        )}

        {/* KPI 6: Alertas Activas */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Alertas Activas"
            value={stats.activeAlerts}
            icon={<Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            changeType={stats.activeAlerts > 5 ? 'negative' : 'neutral'}
            description={
              stats.activeAlerts === 0
                ? 'Todo bajo control'
                : stats.activeAlerts === 1
                  ? '1 alerta sin leer'
                  : `${stats.activeAlerts} alertas sin leer`
            }
          />
        )}

        {/* KPI 7: Uso de Presupuesto */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Uso de Presupuesto"
            value={`${stats.budgetUsage.toFixed(1)}%`}
            changeType={
              stats.budgetUsage > 90 ? 'negative' : stats.budgetUsage > 70 ? 'neutral' : 'positive'
            }
            icon={<PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            description={
              stats.budgetUsage > 90
                ? '¡Cerca del límite!'
                : stats.budgetUsage > 70
                  ? 'Monitorear gastos'
                  : 'Dentro del presupuesto'
            }
          />
        )}

        {/* KPI 8: Categoría con Mayor Gasto */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Categoría Top"
            value={
              stats.topExpenseCategory
                ? formatCurrencyAbsolute(stats.topExpenseCategory.amount)
                : 'N/A'
            }
            valueClassName="text-red-600 dark:text-red-400"
            icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            description={
              stats.topExpenseCategory
                ? `${stats.topExpenseCategory.percent.toFixed(1)}% de tus gastos`
                : 'Sin datos suficientes'
            }
          />
        )}

        {/* KPI 9: Gauge de Presupuesto */}
        {budgetVsActual.isLoading ? (
          <BudgetGaugeSkeleton />
        ) : budgetVsActual.hasActivePeriod ? (
          <BudgetGauge
            totalBudget={budgetVsActual.data.reduce((sum, d) => sum + d.budgeted, 0)}
            totalSpent={budgetVsActual.data.reduce((sum, d) => sum + d.spent, 0)}
            periodName={budgetVsActual.activePeriod?.name}
            daysRemaining={
              budgetVsActual.activePeriod
                ? Math.ceil(
                    (budgetVsActual.activePeriod.endDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : undefined
            }
          />
        ) : null}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance Evolution Chart */}
        {isLoadingBalance ? (
          <BalanceChartSkeleton />
        ) : balanceHistory ? (
          <BalanceChart
            data={balanceHistory.dataPoints}
            trend={balanceHistory.trend}
            startBalance={balanceHistory.startBalance}
            endBalance={balanceHistory.endBalance}
          />
        ) : null}

        {/* Expenses By Category Chart */}
        {isLoadingExpenses ? (
          <ExpensesByCategoryChartSkeleton />
        ) : expensesByCategory ? (
          <ExpensesByCategoryChart
            data={expensesByCategory.categories}
            totalExpenses={expensesByCategory.totalExpenses}
          />
        ) : null}

        {/* Budget vs Actual Chart - NEW */}
        {budgetVsActual.isLoading ? (
          <BudgetVsActualChartSkeleton />
        ) : budgetVsActual.hasActivePeriod && budgetVsActual.data.length > 0 ? (
          <BudgetVsActualChart
            data={budgetVsActual.data}
            totalBudget={budgetVsActual.data.reduce((sum, d) => sum + d.budgeted, 0)}
            totalSpent={budgetVsActual.data.reduce((sum, d) => sum + d.spent, 0)}
          />
        ) : null}

        {/* Weekly Pattern Chart - NEW */}
        {weeklyPattern.isLoading ? (
          <WeeklyPatternChartSkeleton />
        ) : weeklyPattern.data.length > 0 ? (
          <WeeklyPatternChart data={weeklyPattern.data} peakDay={weeklyPattern.peakDay} />
        ) : null}
      </div>

      {/* Widgets Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Transactions Widget */}
        {isLoadingTransactions ? (
          <RecentTransactionsWidgetSkeleton />
        ) : recentTransactions ? (
          <RecentTransactionsWidget transactions={recentTransactions} />
        ) : null}

        {/* Debt Summary Widget */}
        <DebtSummaryWidget />

        {/* Recurring Commitments Widget */}
        {user && currentOrgId && (
          <RecurringCommitmentsWidget orgId={currentOrgId} userId={user.id} />
        )}

        {/* Savings Goals Widget */}
        {user && currentOrgId && (
          <SavingsGoalsWidget orgId={currentOrgId} userId={user.id} />
        )}

        {/* Alerts Widget */}
        {isLoadingAlerts ? (
          <AlertsWidgetSkeleton />
        ) : unreadAlerts ? (
          <AlertsWidget alerts={unreadAlerts} />
        ) : null}
      </div>
    </div>
  );
}
