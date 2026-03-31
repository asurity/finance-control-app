'use client';

import { useState, useMemo, useEffect } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TransactionList } from '@/presentation/components/features/transactions/TransactionList';
import { TransactionFilters } from '@/presentation/components/features/transactions/TransactionFilters';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import type { TransactionFilterState } from '@/types/filters';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  // Initial filters state
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

  // Quick search with debounce
  const [quickSearch, setQuickSearch] = useState('');

  // Debounce quick search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchText: quickSearch }));
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
    />
  );
}

interface TransactionsContentProps {
  orgId: string;
  filters: TransactionFilterState;
  onFiltersChange: (filters: TransactionFilterState) => void;
  quickSearch: string;
  onQuickSearchChange: (search: string) => void;
}

function TransactionsContent({ 
  orgId, 
  filters, 
  onFiltersChange,
  quickSearch,
  onQuickSearchChange,
}: TransactionsContentProps) {
  const transactionsHook = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: transactionsData = [], isLoading: transactionsLoading } = 
    transactionsHook.useTransactionsByDateRange(filters.dateRange.startDate, filters.dateRange.endDate);
  
  const { data: accounts = [], isLoading: accountsLoading } = 
    accountsHook.useAllAccounts();
  
  const { data: categories = [], isLoading: categoriesLoading } = 
    categoriesHook.useAllCategories();

  const accountsMap = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.id] = account.name;
      return acc;
    }, {} as Record<string, string>);
  }, [accounts]);

  const categoriesMap = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);

  // Apply all filters client-side
  const filteredTransactions = useMemo(() => {
    return transactionsData
      .filter(t => filters.type === 'ALL' || t.type === filters.type)
      .filter(t => !filters.categoryId || t.categoryId === filters.categoryId)
      .filter(t => !filters.accountId || t.accountId === filters.accountId)
      .filter(t => !filters.searchText || 
        t.description.toLowerCase().includes(filters.searchText.toLowerCase())
      )
      .filter(t => filters.minAmount === null || t.amount >= filters.minAmount)
      .filter(t => filters.maxAmount === null || t.amount <= filters.maxAmount)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactionsData, filters]);

  // Calculate totals from filtered transactions
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [filteredTransactions]);

  const isLoading = transactionsLoading || accountsLoading || categoriesLoading;
  const periodLabel = `${format(filters.dateRange.startDate, 'dd MMM yyyy', { locale: es })} - ${format(filters.dateRange.endDate, 'dd MMM yyyy', { locale: es })}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Quick Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Transacciones</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona todos tus ingresos y gastos
          </p>
        </div>
        
        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            value={quickSearch}
            onChange={(e) => onQuickSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        accounts={accounts}
        categories={categories}
        onFiltersChange={onFiltersChange}
        initialFilters={filters}
      />

      {/* Totals Bar */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
              <MoneyDisplay amount={totals.income} type="income" size="lg" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Gastos</p>
              <MoneyDisplay amount={totals.expenses} type="expense" size="lg" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <MoneyDisplay amount={totals.balance} type="balance" size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Mostrando {filteredTransactions.length} de {transactionsData.length} transacciones • {periodLabel}
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
