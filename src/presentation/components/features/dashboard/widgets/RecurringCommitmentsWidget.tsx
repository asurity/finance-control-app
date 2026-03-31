'use client';

import { RefreshCw, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { useRecurringTransactions } from '@/application/hooks/useRecurringTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';

interface RecurringCommitmentsWidgetProps {
  orgId: string;
  userId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

export function RecurringCommitmentsWidget({ orgId, userId }: RecurringCommitmentsWidgetProps) {
  const recurringHook = useRecurringTransactions(orgId, userId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: recurringTransactions = [], isLoading: recurringLoading } =
    recurringHook.useActiveRecurringTransactions();

  const { data: accounts = [] } = accountsHook.useAllAccounts();
  const { data: categories = [] } = categoriesHook.useAllCategories();

  // Calculate total monthly commitments
  const monthlyTotal = recurringTransactions
    .filter((rt) => rt.isActive)
    .reduce((sum, rt) => {
      // Convert to monthly equivalent
      let monthlyAmount = 0;
      switch (rt.frequency) {
        case 'DAILY':
          monthlyAmount = rt.amount * 30;
          break;
        case 'WEEKLY':
          monthlyAmount = rt.amount * 4;
          break;
        case 'BIWEEKLY':
          monthlyAmount = rt.amount * 2;
          break;
        case 'MONTHLY':
          monthlyAmount = rt.amount;
          break;
        case 'QUARTERLY':
          monthlyAmount = rt.amount / 3;
          break;
        case 'YEARLY':
          monthlyAmount = rt.amount / 12;
          break;
      }
      return sum + monthlyAmount;
    }, 0);

  // Get next 5 upcoming transactions, sorted by next occurrence date
  const upcomingTransactions = recurringTransactions
    .filter((rt) => rt.isActive)
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime())
    .slice(0, 5);

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Cuenta';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Categoría';
  };

  if (recurringLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Compromisos Recurrentes
          </CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (recurringTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Compromisos Recurrentes
          </CardTitle>
          <CardDescription>No tienes transacciones recurrentes configuradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configura transacciones recurrentes para automatizar tus gastos e ingresos regulares
            </p>
            <Button asChild variant="outline">
              <Link href="/recurring">Configurar Recurrentes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Compromisos Recurrentes
            </CardTitle>
            <CardDescription>Próximas transacciones automáticas</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/recurring">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Total */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground mb-1">Compromisos mensuales estimados</p>
          <div className="text-2xl font-bold">
            <MoneyDisplay amount={monthlyTotal} type="expense" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {recurringTransactions.filter((rt) => rt.isActive).length} transacciones activas
          </p>
        </div>

        {/* Upcoming Transactions */}
        {upcomingTransactions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Próximas transacciones</p>
            <div className="space-y-2">
              {upcomingTransactions.map((rt) => (
                <div
                  key={rt.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{rt.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {FREQUENCY_LABELS[rt.frequency]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(rt.nextOccurrence, 'dd MMM', { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <MoneyDisplay
                      amount={rt.amount}
                      type={rt.type.toLowerCase() as 'income' | 'expense'}
                      className="font-semibold"
                    />
                    <p className="text-xs text-muted-foreground truncate">
                      {getAccountName(rt.accountId)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
