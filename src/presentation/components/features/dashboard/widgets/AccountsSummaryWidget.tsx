/**
 * Accounts Summary Widget
 * Shows all active accounts with their balances
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  CreditCard,
  Building,
  Landmark,
  TrendingUp,
  ArrowRight,
  HandCoins,
} from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'LINE_OF_CREDIT';
  balance: number;
  isActive: boolean;
  creditLimit?: number;
  availableCredit?: number;
}

interface AccountsSummaryWidgetProps {
  accounts: Account[];
  totalBalance: number;
}

const accountIcons = {
  CHECKING: Building,
  SAVINGS: Landmark,
  CREDIT_CARD: CreditCard,
  LINE_OF_CREDIT: HandCoins,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
};

const accountLabels = {
  CHECKING: 'Cuenta Corriente',
  SAVINGS: 'Cuenta de Ahorro',
  CREDIT_CARD: 'Tarjeta de Crédito',
  LINE_OF_CREDIT: 'Línea de Crédito',
  CASH: 'Efectivo',
  INVESTMENT: 'Inversión',
};

export function AccountsSummaryWidget({ accounts, totalBalance }: AccountsSummaryWidgetProps) {
  const activeAccounts = accounts.filter((acc) => acc.isActive);

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
          Balance total: <MoneyDisplay amount={totalBalance} type="balance" size="sm" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeAccounts.map((account) => {
            const Icon = accountIcons[account.type];
            const isCreditAccount =
              account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT';
            const creditLimit = account.creditLimit || 0;

            // Calculate used credit and available credit based on account type
            let usedCredit = 0;
            let availableCredit = 0;

            if (isCreditAccount && creditLimit > 0) {
              if (account.type === 'LINE_OF_CREDIT') {
                // LINE_OF_CREDIT: balance is available (positive), used = limit - balance
                availableCredit = account.balance;
                usedCredit = creditLimit - account.balance;
              } else {
                // CREDIT_CARD: balance is debt (negative), used = |balance|
                usedCredit = Math.abs(account.balance);
                availableCredit = creditLimit - usedCredit;
              }
            }

            const creditUtilization =
              isCreditAccount && creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

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
                    <p className="text-xs text-muted-foreground">{accountLabels[account.type]}</p>
                  </div>
                </div>
                {isCreditAccount && creditLimit > 0 ? (
                  <div className="text-right space-y-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Usado: </span>
                      <MoneyDisplay
                        amount={usedCredit}
                        type="expense"
                        size="sm"
                        className="inline"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Límite:{' '}
                      <MoneyDisplay
                        amount={creditLimit}
                        type="neutral"
                        size="sm"
                        className="inline"
                      />
                    </div>
                    <Progress value={creditUtilization} className="h-1.5 w-24" />
                  </div>
                ) : (
                  <MoneyDisplay
                    amount={account.balance}
                    type="balance"
                    size="sm"
                    className="font-bold"
                  />
                )}
              </div>
            );
          })}
        </div>
        <Link
          href="/accounts"
          className="flex items-center justify-center gap-2 mt-4 text-sm text-primary hover:underline"
        >
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
