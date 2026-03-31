/**
 * Debt Summary Widget
 * Shows net worth, assets vs debts breakdown, and credit card utilization
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, CreditCard, ArrowRight, AlertCircle } from 'lucide-react';
import { useDebtSummary } from '../hooks/useDebtSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DebtSummaryWidget() {
  const { data: summary, isLoading, error } = useDebtSummary();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-lg">Estado Financiero</CardTitle>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <CardDescription>Patrimonio neto y deudas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Cargando resumen financiero...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Estado Financiero</CardTitle>
          </div>
          <CardDescription>Patrimonio neto y deudas</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar resumen de deudas:{' '}
              {error instanceof Error ? error.message : 'Error desconocido'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const { netWorth, totalAssets, totalDebt, creditCards } = summary;

  // Calculate percentage of assets vs debts
  const total = totalAssets + totalDebt;
  const assetsPercent = total > 0 ? (totalAssets / total) * 100 : 50;
  const debtsPercent = total > 0 ? (totalDebt / total) * 100 : 50;

  // Net worth color based on value
  const netWorthColor =
    netWorth >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
  const netWorthIcon = netWorth >= 0 ? '↑' : '↓';

  // Get top 3 credit cards by debt amount
  const topCreditCards = [...creditCards].sort((a, b) => b.balance - a.balance).slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Estado Financiero</CardTitle>
          </div>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription>Patrimonio neto y deudas</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Net Worth */}
        <div className="text-center py-3 px-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Patrimonio Neto</p>
          <div className="flex items-center justify-center gap-1">
            <span className={`text-2xl font-bold ${netWorthColor}`}>{netWorthIcon}</span>
            <MoneyDisplay
              amount={Math.abs(netWorth)}
              type="balance"
              className="text-2xl font-bold"
              showSign={false}
            />
          </div>
        </div>

        {/* Assets vs Debts Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Activos</span>
            </div>
            <MoneyDisplay
              amount={totalAssets}
              type="balance"
              className="font-medium"
              showSign={false}
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Deudas</span>
            </div>
            <MoneyDisplay
              amount={totalDebt}
              type="expense"
              className="font-medium"
              showSign={false}
            />
          </div>

          {/* Visual bar */}
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {totalAssets > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${assetsPercent}%` }} />
            )}
            {totalDebt > 0 && (
              <div className="bg-red-500 transition-all" style={{ width: `${debtsPercent}%` }} />
            )}
          </div>
        </div>

        {/* Credit Cards Summary */}
        {creditCards.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tarjetas de Crédito</span>
              <span className="text-xs text-muted-foreground">({creditCards.length})</span>
            </div>

            <div className="space-y-3">
              {topCreditCards.map((card) => {
                // Color based on utilization
                let utilizationColor = 'bg-green-500';
                if (card.utilizationPercent >= 90) {
                  utilizationColor = 'bg-red-500';
                } else if (card.utilizationPercent >= 70) {
                  utilizationColor = 'bg-yellow-500';
                }

                return (
                  <div key={card.accountId} className="space-y-1">
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.accountName}</p>
                        {card.bankName && (
                          <p className="text-xs text-muted-foreground truncate">{card.bankName}</p>
                        )}
                      </div>
                      <MoneyDisplay
                        amount={card.balance}
                        type="expense"
                        className="text-sm font-medium ml-2"
                        showSign={false}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress
                        value={card.utilizationPercent}
                        className="h-1.5 flex-1"
                        indicatorClassName={utilizationColor}
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {card.utilizationPercent.toFixed(0)}%
                      </span>
                    </div>

                    {card.daysUntilPayment !== null && card.daysUntilPayment <= 7 && (
                      <p className="text-xs text-orange-600 dark:text-orange-500">
                        Pago en {card.daysUntilPayment} día{card.daysUntilPayment !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {creditCards.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{creditCards.length - 3} tarjeta{creditCards.length - 3 !== 1 ? 's' : ''} más
              </p>
            )}
          </div>
        )}

        {/* Link to accounts page */}
        <Link
          href="/accounts"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
        >
          <span>Ver todas las cuentas</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
