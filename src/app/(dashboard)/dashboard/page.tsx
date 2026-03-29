'use client';

/**
 * Dashboard Page
 * Main dashboard with real-time KPIs and metrics
 */

import { useState } from 'react';
import { useDashboardStats } from '@/presentation/components/features/dashboard/hooks/useDashboardStats';
import { useBalanceHistory } from '@/presentation/components/features/dashboard/hooks/useBalanceHistory';
import { useExpensesByCategory } from '@/presentation/components/features/dashboard/hooks/useExpensesByCategory';
import { useRecentTransactions } from '@/presentation/components/features/dashboard/hooks/useRecentTransactions';
import { useAccountsSummary } from '@/presentation/components/features/dashboard/hooks/useAccountsSummary';
import { useUnreadAlerts } from '@/presentation/components/features/dashboard/hooks/useUnreadAlerts';
import { KPICard, KPICardSkeleton } from '@/presentation/components/shared/Cards/KPICard';
import { BalanceChart, BalanceChartSkeleton } from '@/presentation/components/features/dashboard/charts/BalanceChart';
import { ExpensesByCategoryChart, ExpensesByCategoryChartSkeleton } from '@/presentation/components/features/dashboard/charts/ExpensesByCategoryChart';
import { RecentTransactionsWidget, RecentTransactionsWidgetSkeleton } from '@/presentation/components/features/dashboard/widgets/RecentTransactionsWidget';
import { AccountsSummaryWidget, AccountsSummaryWidgetSkeleton } from '@/presentation/components/features/dashboard/widgets/AccountsSummaryWidget';
import { AlertsWidget, AlertsWidgetSkeleton } from '@/presentation/components/features/dashboard/widgets/AlertsWidget';
import { formatCurrency } from '@/lib/utils/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Bell, PieChart, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export default function DashboardPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const { data: stats, isLoading, error, refetch, isFetching } = useDashboardStats(period);
  const { data: balanceHistory, isLoading: isLoadingBalance } = useBalanceHistory(period);
  const { data: expensesByCategory, isLoading: isLoadingExpenses } = useExpensesByCategory(period);
  const { data: recentTransactions, isLoading: isLoadingTransactions } = useRecentTransactions(5);
  const { data: accountsSummary, isLoading: isLoadingAccounts } = useAccountsSummary();
  const { data: unreadAlerts, isLoading: isLoadingAlerts } = useUnreadAlerts(3);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await refetch();
      toast.success('Dashboard actualizado');
    } catch (error) {
      toast.error('Error al actualizar dashboard', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
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
            <p className="font-medium">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            <div className="text-xs bg-muted p-3 rounded-md text-left">
              <p><strong>Usuario:</strong> {user?.email || 'No autenticado'}</p>
              <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
              <p><strong>Org ID:</strong> {currentOrgId || 'No establecida'}</p>
              <p><strong>Período:</strong> {period}</p>
            </div>
            <p className="text-xs italic">Revisa la consola del navegador (F12) para más detalles</p>
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de tu situación financiera - {getPeriodLabel()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
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

      {/* KPIs Grid - Primary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Balance Total */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Balance Total"
            value={formatCurrency(stats.currentBalance)}
            change={stats.monthlyChangePercent}
            changeType={stats.monthlyChange > 0 ? 'positive' : stats.monthlyChange < 0 ? 'negative' : 'neutral'}
            icon={<DollarSign className="h-4 w-4" />}
          />
        )}

        {/* KPI 2: Ingresos del Período */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title={`Ingresos ${period === 'month' ? 'del Mes' : period === 'quarter' ? 'del Trimestre' : 'del Año'}`}
            value={formatCurrency(stats.totalIncome)}
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            description={`${stats.transactionCounts.income} transacciones`}
          />
        )}

        {/* KPI 3: Gastos del Período */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title={`Gastos ${period === 'month' ? 'del Mes' : period === 'quarter' ? 'del Trimestre' : 'del Año'}`}
            value={formatCurrency(stats.totalExpenses)}
            icon={<TrendingDown className="h-4 w-4 text-red-600" />}
            description={`${stats.transactionCounts.expense} transacciones`}
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
              stats.savingsRate > 20 ? 'positive' : 
              stats.savingsRate > 10 ? 'neutral' : 
              'negative'
            }
            icon={<Wallet className="h-4 w-4" />}
            description={
              stats.savingsRate > 20 ? '¡Excelente tasa de ahorro!' :
              stats.savingsRate > 10 ? 'Buena tasa de ahorro' :
              'Considera aumentar tus ahorros'
            }
          />
        )}
      </div>

      {/* KPIs Grid - Secondary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI 5: Pagos Pendientes */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Pagos Pendientes"
            value={stats.pendingPayments}
            icon={<CreditCard className="h-4 w-4" />}
            changeType={stats.pendingPayments > 0 ? 'neutral' : 'positive'}
            description={
              stats.pendingPayments === 0 ? 'Sin pagos pendientes' :
              stats.pendingPayments === 1 ? '1 pago próximo' :
              `${stats.pendingPayments} pagos próximos`
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
            icon={<Bell className="h-4 w-4" />}
            changeType={stats.activeAlerts > 5 ? 'negative' : 'neutral'}
            description={
              stats.activeAlerts === 0 ? 'Todo bajo control' :
              stats.activeAlerts === 1 ? '1 alerta sin leer' :
              `${stats.activeAlerts} alertas sin leer`
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
              stats.budgetUsage > 90 ? 'negative' :
              stats.budgetUsage > 70 ? 'neutral' :
              'positive'
            }
            icon={<PieChart className="h-4 w-4" />}
            description={
              stats.budgetUsage > 90 ? '¡Cerca del límite!' :
              stats.budgetUsage > 70 ? 'Monitorear gastos' :
              'Dentro del presupuesto'
            }
          />
        )}

        {/* KPI 8: Categoría con Mayor Gasto */}
        {isLoading || !stats ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Categoría Top"
            value={stats.topExpenseCategory ? formatCurrency(stats.topExpenseCategory.amount) : 'N/A'}
            icon={<TrendingDown className="h-4 w-4" />}
            description={
              stats.topExpenseCategory 
                ? `${stats.topExpenseCategory.percent.toFixed(1)}% de tus gastos`
                : 'Sin datos suficientes'
            }
          />
        )}
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
      </div>

      {/* Widgets Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Transactions Widget */}
        {isLoadingTransactions ? (
          <RecentTransactionsWidgetSkeleton />
        ) : recentTransactions ? (
          <RecentTransactionsWidget transactions={recentTransactions} />
        ) : null}

        {/* Accounts Summary Widget */}
        {isLoadingAccounts ? (
          <AccountsSummaryWidgetSkeleton />
        ) : accountsSummary ? (
          <AccountsSummaryWidget 
            accounts={accountsSummary.accounts} 
            totalBalance={accountsSummary.totalBalance}
          />
        ) : null}

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
