'use client';

import { Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { useSavingsGoals } from '@/application/hooks/useSavingsGoals';

interface SavingsGoalsWidgetProps {
  orgId: string;
  userId: string;
}

export function SavingsGoalsWidget({ orgId, userId }: SavingsGoalsWidgetProps) {
  const savingsHook = useSavingsGoals(orgId, userId);
  const { data: savingsGoals = [], isLoading } = savingsHook.useActiveSavingsGoals();

  if (isLoading) {
    return <SavingsGoalsWidgetSkeleton />;
  }

  if (savingsGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas de Ahorro
          </CardTitle>
          <CardDescription>No tienes metas de ahorro activas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Crea metas de ahorro para alcanzar tus objetivos financieros
            </p>
            <Button asChild variant="outline">
              <Link href="/savings">Crear Meta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show top 3 active goals sorted by progress (closest to completion first)
  const topGoals = [...savingsGoals]
    .map((goal) => ({
      ...goal,
      progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas de Ahorro
            </CardTitle>
            <CardDescription>{savingsGoals.length} meta{savingsGoals.length !== 1 ? 's' : ''} activa{savingsGoals.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/savings">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground mb-1">Total ahorrado</p>
          <div className="text-2xl font-bold">
            <MoneyDisplay amount={totalSaved} type="income" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            de <MoneyDisplay amount={totalTarget} type="neutral" size="sm" /> en total
          </p>
        </div>

        {/* Top Goals */}
        <div className="space-y-3">
          {topGoals.map((goal) => (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{goal.icon || '🎯'}</span>
                  <span className="font-medium truncate max-w-[140px]">{goal.name}</span>
                </div>
                <span className="text-muted-foreground">{goal.progress.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(goal.progress, 100)} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <MoneyDisplay amount={goal.currentAmount} type="income" size="sm" />
                <MoneyDisplay amount={goal.targetAmount} type="neutral" size="sm" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SavingsGoalsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas de Ahorro
        </CardTitle>
        <CardDescription>Cargando...</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
