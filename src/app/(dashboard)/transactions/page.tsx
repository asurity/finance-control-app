'use client';

import { useState, useMemo } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionList } from '@/presentation/components/features/transactions/TransactionList';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  const [dateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

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
      startDate={dateRange.startDate}
      endDate={dateRange.endDate}
    />
  );
}

interface TransactionsContentProps {
  orgId: string;
  startDate: Date;
  endDate: Date;
}

function TransactionsContent({ orgId, startDate, endDate }: TransactionsContentProps) {
  const transactionsHook = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: transactionsData = [], isLoading: transactionsLoading } = 
    transactionsHook.useTransactionsByDateRange(startDate, endDate);
  
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

  const sortedTransactions = useMemo(() => {
    return [...transactionsData].sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });
  }, [transactionsData]);

  const isLoading = transactionsLoading || accountsLoading || categoriesLoading;
  const periodLabel = `${format(startDate, 'dd MMM yyyy', { locale: es })} - ${format(endDate, 'dd MMM yyyy', { locale: es })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Transacciones</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestiona todos tus ingresos y gastos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
          <CardDescription>
            Mostrando {sortedTransactions.length} transacciones entre {periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando transacciones...</p>
            </div>
          ) : (
            <TransactionList
              orgId={orgId}
              transactions={sortedTransactions}
              categories={categoriesMap}
              accounts={accountsMap}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
