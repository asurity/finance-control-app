'use client';

import { useState, useMemo } from 'react';
import { Plus, Target, Pencil, Trash2, PiggyBank, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { SavingsGoalForm } from '@/presentation/components/features/savings-goals/SavingsGoalForm';
import { ContributionForm } from '@/presentation/components/features/savings-goals/ContributionForm';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useSavingsGoals } from '@/application/hooks/useSavingsGoals';
import type { SavingsGoal, SavingsGoalStatus } from '@/types/firestore';

const STATUS_LABELS: Record<SavingsGoalStatus, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_VARIANTS: Record<SavingsGoalStatus, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

export default function SavingsGoalsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return <SavingsGoalsContent orgId={currentOrgId} userId={user.id} />;
}

interface SavingsGoalsContentProps {
  orgId: string;
  userId: string;
}

function SavingsGoalsContent({ orgId, userId }: SavingsGoalsContentProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [cancellingGoalId, setCancellingGoalId] = useState<string | null>(null);

  const savingsHook = useSavingsGoals(orgId, userId);
  const { data: savingsGoals = [], isLoading } = savingsHook.useAllSavingsGoals();

  const { mutate: deleteGoal } = savingsHook.deleteSavingsGoal;
  const { mutate: cancelGoal } = savingsHook.cancelSavingsGoal;

  // Summary calculations
  const summary = useMemo(() => {
    const activeGoals = savingsGoals.filter((g) => g.status === 'ACTIVE');
    const completedGoals = savingsGoals.filter((g) => g.status === 'COMPLETED');
    const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return {
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      totalTarget,
      totalSaved,
      overallProgress,
    };
  }, [savingsGoals]);

  const handleDelete = () => {
    if (deletingGoalId) {
      deleteGoal(deletingGoalId);
      setDeletingGoalId(null);
    }
  };

  const handleCancel = () => {
    if (cancellingGoalId) {
      cancelGoal(cancellingGoalId);
      setCancellingGoalId(null);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'text-green-600 dark:text-green-400';
    if (percent >= 75) return 'text-blue-600 dark:text-blue-400';
    if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando metas de ahorro...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7" />
            Metas de Ahorro
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus objetivos de ahorro y monitorea tu progreso
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Meta de Ahorro</DialogTitle>
              <DialogDescription>
                Define un objetivo de ahorro para alcanzar tus metas financieras
              </DialogDescription>
            </DialogHeader>
            <SavingsGoalForm
              orgId={orgId}
              userId={userId}
              onSuccess={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Ahorro</CardTitle>
          <CardDescription>Progreso general de tus metas activas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Ahorrado</p>
              <div className="text-2xl font-bold">
                <MoneyDisplay amount={summary.totalSaved} type="income" size="lg" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Objetivo Total</p>
              <div className="text-2xl font-bold">
                <MoneyDisplay amount={summary.totalTarget} type="neutral" size="lg" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Progreso General</p>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{summary.overallProgress.toFixed(1)}%</p>
                <Progress value={Math.min(summary.overallProgress, 100)} className="h-2" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Metas</p>
              <div className="flex items-center gap-3">
                <Badge variant="default">{summary.activeCount} activas</Badge>
                <Badge variant="secondary">{summary.completedCount} completadas</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Metas</CardTitle>
          <CardDescription>
            {savingsGoals.length === 0
              ? 'No tienes metas de ahorro configuradas'
              : `${savingsGoals.length} meta${savingsGoals.length !== 1 ? 's' : ''} configurada${savingsGoals.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savingsGoals.length === 0 ? (
            <div className="text-center py-12">
              <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay metas de ahorro</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera meta de ahorro para empezar a construir tu futuro financiero
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Meta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meta</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Ahorrado</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savingsGoals.map((goal) => {
                    const progress = goal.targetAmount > 0
                      ? (goal.currentAmount / goal.targetAmount) * 100
                      : 0;

                    return (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{goal.icon || '🎯'}</span>
                            <div>
                              <span className="font-medium">{goal.name}</span>
                              {goal.description && (
                                <p className="text-xs text-muted-foreground">{goal.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={getProgressColor(progress)}>
                                {progress.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <MoneyDisplay amount={goal.currentAmount} type="income" />
                        </TableCell>
                        <TableCell>
                          <MoneyDisplay amount={goal.targetAmount} type="neutral" />
                        </TableCell>
                        <TableCell>
                          {goal.targetDate
                            ? format(
                                goal.targetDate instanceof Date
                                  ? goal.targetDate
                                  : new Date(goal.targetDate),
                                'dd MMM yyyy',
                                { locale: es }
                              )
                            : 'Sin fecha'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[goal.status]}>
                            {STATUS_LABELS[goal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {goal.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setContributingGoal(goal)}
                                title="Contribuir"
                              >
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingGoal(goal)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {goal.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCancellingGoalId(goal.id)}
                                title="Cancelar meta"
                              >
                                <ArrowRight className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingGoalId(goal.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Meta de Ahorro</DialogTitle>
            <DialogDescription>
              Modifica los detalles de tu meta de ahorro
            </DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <SavingsGoalForm
              orgId={orgId}
              userId={userId}
              initialData={editingGoal}
              onSuccess={() => setEditingGoal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Contribution Dialog */}
      <Dialog open={!!contributingGoal} onOpenChange={(open) => !open && setContributingGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contribuir a Meta</DialogTitle>
            <DialogDescription>
              {contributingGoal && `Aportar a "${contributingGoal.name}"`}
            </DialogDescription>
          </DialogHeader>
          {contributingGoal && (
            <ContributionForm
              orgId={orgId}
              userId={userId}
              goal={contributingGoal}
              onSuccess={() => setContributingGoal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingGoalId}
        onOpenChange={(open) => !open && setDeletingGoalId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar meta de ahorro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La meta de ahorro será eliminada permanentemente
              junto con su historial de contribuciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!cancellingGoalId}
        onOpenChange={(open) => !open && setCancellingGoalId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar meta de ahorro?</AlertDialogTitle>
            <AlertDialogDescription>
              La meta será marcada como cancelada. Podrás ver su historial pero no se aceptarán
              más contribuciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar Meta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
