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
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
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
  PeriodBalanceChart,
  PeriodBalanceChartSkeleton,
} from '@/presentation/components/features/dashboard/charts/PeriodBalanceChart';
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
import { startOfWeek, endOfWeek } from 'date-fns';
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

type DashboardPeriod = 'activePeriod' | 'week' | 'month' | 'quarter' | 'year';
type HooksPeriod = 'week' | 'month' | 'quarter' | 'year';

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('activePeriod');
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  
  // Obtener periodo activo de presupuesto
  const budgetPeriodsHook = useBudgetPeriods(currentOrgId || '');
  const { data: activePeriodsData } = budgetPeriodsHook.useActiveBudgetPeriods(user?.id || '');
  
  // Encontrar el periodo que contiene la fecha actual
  const activeBudgetPeriod = useMemo(() => {
    const periods = activePeriodsData?.budgetPeriods ?? [];
    if (periods.length === 0) return null;
    const now = new Date();
    const current = periods.find(p => p.startDate <= now && p.endDate >= now);
    if (current) {
      return {
        startDate: current.startDate,
        endDate: current.endDate,
        name: current.name ?? '',
      };
    }
    // Si no encuentra, usar el más reciente
    return {
      startDate: periods[0].startDate,
      endDate: periods[0].endDate,
      name: periods[0].name ?? '',
    };
  }, [activePeriodsData]);
  
  // Convertir 'activePeriod' a un periodo válido para los hooks
  // Los hooks esperan 'week' | 'month' | 'quarter' | 'year'
  const hooksPeriod: HooksPeriod = period === 'activePeriod' ? 'month' : period;
  
  const { data: stats, isLoading, error, refetch, isFetching } = useDashboardStats(hooksPeriod);
  const { data: balanceHistory, isLoading: isLoadingBalance } = useBalanceHistory(hooksPeriod);
  const { data: expensesByCategory, isLoading: isLoadingExpenses } = useExpensesByCategory(hooksPeriod);
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
    
    // Si es periodo activo y existe, usar esas fechas
    if (period === 'activePeriod' && activeBudgetPeriod) {
      return {
        startDate: activeBudgetPeriod.startDate,
        endDate: activeBudgetPeriod.endDate,
      };
    }
    
    // Fallback a otros periodos
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
      case 'activePeriod':
        // Fallback si no hay periodo activo: usar mes actual
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    return { startDate: start, endDate: end };
  }, [period, activeBudgetPeriod]);

  // Calculate date range for weekly pattern - independent of selected period
  // Show current week (Monday to Sunday) to analyze spending patterns
  const weeklyPatternDates = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    return { startDate: start, endDate: end };
  }, []);

  const weeklyPattern = useWeeklyPattern(
    currentOrgId || '',
    weeklyPatternDates.startDate,
    weeklyPatternDates.endDate
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
      case 'activePeriod':
        return activeBudgetPeriod?.name || 'Periodo Activo';
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activePeriod">
                {activeBudgetPeriod?.name || 'Periodo Activo'}
              </SelectItem>
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
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
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-income" />
              <span className="text-muted-foreground">Ingresos:</span>
              <span className="font-medium text-income">
                {formatCurrencyAbsolute(stats.totalIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-expense" />
              <span className="text-muted-foreground">Gastos:</span>
              <span className="font-medium text-expense">
                {formatCurrencyAbsolute(stats.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Period Balance Chart - Daily Accumulations */}
          {stats.dailyAccumulations && stats.dailyAccumulations.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Acumulado del Período
              </h4>
              <PeriodBalanceChart data={stats.dailyAccumulations} period={hooksPeriod} />
            </div>
          )}
        </div>
      )}


      {/* Financial Projection Widget */}
      <FinancialProjectionWidget />

      {/* KPIs Grid - Row 1: Disponible e Ingresos */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* KPI 1: Disponible para Gastar */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Disponible para Gastar"
            value={formatCurrency(stats.availableToSpend)}
            valueClassName={
              stats.availableToSpend >= 0
                ? 'text-income'
                : 'text-expense'
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
            valueClassName="text-income"
            icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-income" />}
            description={`${stats.transactionCounts.income} transacciones`}
            sparklineData={incomeSparkline}
          />
        )}
      </div>

      {/* KPIs Grid - Row 2: Gastos y Categoría Top */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* KPI 3: Gastos del Período */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title={`Gastos ${period === 'week' ? 'de la Semana' : period === 'month' ? 'del Mes' : period === 'quarter' ? 'del Trimestre' : 'del Año'}`}
            value={formatCurrencyAbsolute(stats.totalExpenses)}
            valueClassName="text-expense"
            icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-expense" />}
            description={`${stats.transactionCounts.expense} transacciones`}
            sparklineData={expensesSparkline}
          />
        )}

        {/* KPI 4: Categoría con Mayor Gasto */}
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
            valueClassName="text-expense"
            icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            description={
              stats.topExpenseCategory
                ? `${stats.topExpenseCategory.percent.toFixed(1)}% de tus gastos`
                : 'Sin datos suficientes'
            }
          />
        )}
      </div>

      {/* Row 3: Presupuesto del Periodo y Patrón Semanal */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gauge de Presupuesto */}
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

        {/* Weekly Pattern Chart */}
        {weeklyPattern.isLoading ? (
          <WeeklyPatternChartSkeleton />
        ) : weeklyPattern.data.length > 0 ? (
          <WeeklyPatternChart data={weeklyPattern.data} peakDay={weeklyPattern.peakDay} />
        ) : null}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">

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
      </div>

      {/* Widgets Section - Row 1: Transacciones y Estado Financiero */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Transactions Widget */}
        {isLoadingTransactions ? (
          <RecentTransactionsWidgetSkeleton />
        ) : recentTransactions ? (
          <RecentTransactionsWidget transactions={recentTransactions} />
        ) : null}

        {/* Debt Summary Widget */}
        <DebtSummaryWidget />
      </div>

      {/* Widgets Section - Row 2: Alertas */}
      <div className="grid gap-4">
        {/* Alerts Widget */}
        {isLoadingAlerts ? (
          <AlertsWidgetSkeleton />
        ) : unreadAlerts ? (
          <AlertsWidget alerts={unreadAlerts} />
        ) : null}
      </div>

      {/* Widgets Section - Row 2: Compromisos y Metas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recurring Commitments Widget */}
        {user && currentOrgId && (
          <RecurringCommitmentsWidget orgId={currentOrgId} userId={user.id} />
        )}

        {/* Savings Goals Widget */}
        {user && currentOrgId && (
          <SavingsGoalsWidget orgId={currentOrgId} userId={user.id} />
        )}
      </div>
    </div>
  );
}
