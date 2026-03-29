/**
 * Accounts Summary Widget
 * Shows all active accounts with their balances
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { Wallet, CreditCard, Building, Landmark, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
  balance: number;
  isActive: boolean;
}

interface AccountsSummaryWidgetProps {
  accounts: Account[];
  totalBalance: number;
}

const accountIcons = {
  CHECKING: Building,
  SAVINGS: Landmark,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
};

const accountLabels = {
  CHECKING: 'Cuenta Corriente',
  SAVINGS: 'Cuenta de Ahorro',
  CREDIT_CARD: 'Tarjeta de Crédito',
  CASH: 'Efectivo',
  INVESTMENT: 'Inversión',
};

export function AccountsSummaryWidget({ accounts, totalBalance }: AccountsSummaryWidgetProps) {
  const activeAccounts = accounts.filter(acc => acc.isActive);

  if (activeAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas</CardTitle>
          <CardDescription>Balance total de tus cuentas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No tienes cuentas activas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Cuentas</CardTitle>
        <CardDescription>
          Balance total: {formatCurrency(totalBalance)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeAccounts.map((account) => {
            const Icon = accountIcons[account.type];
            const isNegative = account.balance < 0;
            
            return (
              <div 
                key={account.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {accountLabels[account.type]}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${
                  isNegative ? 'text-red-600' : 'text-foreground'
                }`}>
                  {formatCurrency(account.balance)}
                </p>
              </div>
            );
          })}
        </div>
        <Link href="/accounts" className="flex items-center justify-center gap-2 mt-4 text-sm text-primary hover:underline">
          Administrar cuentas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function AccountsSummaryWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
