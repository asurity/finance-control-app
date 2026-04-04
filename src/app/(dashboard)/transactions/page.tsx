'use client';

import { useState, useMemo, useEffect } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TransactionList } from '@/presentation/components/features/transactions/TransactionList';
import { TransactionFilters } from '@/presentation/components/features/transactions/TransactionFilters';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { toast } from 'sonner';
import type { TransactionFilterState } from '@/types/filters';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const budgetPeriodsHook = useBudgetPeriods(currentOrgId || '');

  // Obtener periodos activos de la organización
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

  // Initial filters state - usar periodo activo si está disponible
  const [filters, setFilters] = useState<TransactionFilterState>({
    dateRange: {
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    },
    type: 'ALL',
    categoryId: null,
    accountId: null,
    searchText: '',
    minAmount: null,
    maxAmount: null,
  });

  // Update filters when budget period loads
  useEffect(() => {
    if (activeBudgetPeriod) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[TransactionsPage] Setting filters to active period:', activeBudgetPeriod);
      }
      setFilters(prev => ({
        ...prev,
        dateRange: {
          startDate: activeBudgetPeriod.startDate,
          endDate: activeBudgetPeriod.endDate,
        },
      }));
    }
  }, [activeBudgetPeriod]);

  // Quick search with debounce
  const [quickSearch, setQuickSearch] = useState('');

  // Debounce quick search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchText: quickSearch }));
    }, 300);

    return () => clearTimeout(timer);
  }, [quickSearch]);

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <TransactionsContent
      orgId={currentOrgId}
      filters={filters}
      onFiltersChange={setFilters}
      quickSearch={quickSearch}
      onQuickSearchChange={setQuickSearch}
      activeBudgetPeriod={activeBudgetPeriod}
    />
  );
}

interface TransactionsContentProps {
  orgId: string;
  filters: TransactionFilterState;
  onFiltersChange: (filters: TransactionFilterState) => void;
  quickSearch: string;
  onQuickSearchChange: (search: string) => void;
  activeBudgetPeriod?: {
    startDate: Date;
    endDate: Date;
    name: string;
  } | null;
}

function TransactionsContent({
  orgId,
  filters,
  onFiltersChange,
  quickSearch,
  onQuickSearchChange,
  activeBudgetPeriod,
}: TransactionsContentProps) {
  const { user } = useAuth();
  const transactionsHook = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: transactionsData = [], isLoading: transactionsLoading } =
    transactionsHook.useTransactionsByDateRange(
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );

  const { data: accounts = [], isLoading: accountsLoading } = accountsHook.useAllAccounts();

  const { data: categories = [], isLoading: categoriesLoading } = categoriesHook.useAllCategories();

  const accountsMap = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        acc[account.id] = account.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [accounts]);

  const categoriesMap = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category.id] = category.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [categories]);

  // Apply all filters client-side
  const filteredTransactions = useMemo(() => {
    return transactionsData
      .filter((t) => filters.type === 'ALL' || t.type === filters.type)
      .filter((t) => !filters.categoryId || t.categoryId === filters.categoryId)
      .filter((t) => !filters.accountId || t.accountId === filters.accountId)
      .filter(
        (t) =>
          !filters.searchText ||
          t.description.toLowerCase().includes(filters.searchText.toLowerCase())
      )
      .filter((t) => filters.minAmount === null || t.amount >= filters.minAmount)
      .filter((t) => filters.maxAmount === null || t.amount <= filters.maxAmount)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactionsData, filters]);

  // Calculate totals from filtered transactions
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [filteredTransactions]);

  const isLoading = transactionsLoading || accountsLoading || categoriesLoading;
  const periodLabel = `${format(filters.dateRange.startDate, 'dd MMM yyyy', { locale: es })} - ${format(filters.dateRange.endDate, 'dd MMM yyyy', { locale: es })}`;

  const handleExportCSV = () => {
    try {
      const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Monto'];
      const rows = filteredTransactions.map((t) => [
        format(new Date(t.date), 'dd/MM/yyyy', { locale: es }),
        t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
        `"${t.description.replace(/"/g, '""')}"`,
        `"${categoriesMap[t.categoryId] || 'Sin categoría'}"`,
        `"${accountsMap[t.accountId] || 'Sin cuenta'}"`,
        t.amount.toString(),
      ]);

      rows.push([]);
      rows.push(['', '', '', '', 'Total Ingresos', totals.income.toString()]);
      rows.push(['', '', '', '', 'Total Gastos', totals.expenses.toString()]);
      rows.push(['', '', '', '', 'Balance', totals.balance.toString()]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transacciones_${format(filters.dateRange.startDate, 'yyyy-MM-dd')}_${format(filters.dateRange.endDate, 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Transacciones exportadas');
    } catch (error) {
      toast.error('Error al exportar');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Quick Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Transacciones
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona todos tus ingresos y gastos
          </p>
          {activeBudgetPeriod && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              <span className="font-medium">Periodo activo:</span>{' '}
              {format(activeBudgetPeriod.startDate, "dd 'de' MMMM", { locale: es })} -{' '}
              {format(activeBudgetPeriod.endDate, "dd 'de' MMMM, yyyy", { locale: es })}
            </p>
          )}
        </div>

        {/* Quick Search + Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por descripción..."
              value={quickSearch}
              onChange={(e) => onQuickSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleExportCSV} title="Exportar CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        accounts={accounts}
        categories={categories}
        onFiltersChange={onFiltersChange}
        initialFilters={filters}
        activeBudgetPeriod={activeBudgetPeriod}
      />

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Mostrando {filteredTransactions.length} de {transactionsData.length} transacciones •{' '}
            {periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando transacciones...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No se encontraron transacciones</p>
              <p className="text-sm text-muted-foreground">
                Intenta ajustar los filtros para ver más resultados
              </p>
            </div>
          ) : (
            <TransactionList
              orgId={orgId}
              transactions={filteredTransactions}
              categories={categoriesMap}
              accounts={accountsMap}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
