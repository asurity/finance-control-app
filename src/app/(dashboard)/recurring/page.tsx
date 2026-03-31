'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Pause, Play, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { RecurringTransactionForm } from '@/presentation/components/features/recurring/RecurringTransactionForm';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringTransactions } from '@/application/hooks/useRecurringTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import type { RecurringTransaction } from '@/types/firestore';

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const FREQUENCY_ICONS: Record<string, string> = {
  DAILY: '📅',
  WEEKLY: '📆',
  BIWEEKLY: '🗓️',
  MONTHLY: '📅',
  QUARTERLY: '📊',
  YEARLY: '🎯',
};

export default function RecurringTransactionsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return <RecurringTransactionsContent orgId={currentOrgId} userId={user.id} />;
}

interface RecurringTransactionsContentProps {
  orgId: string;
  userId: string;
}

function RecurringTransactionsContent({ orgId, userId }: RecurringTransactionsContentProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const recurringHook = useRecurringTransactions(orgId, userId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: recurringTransactions = [], isLoading: recurringLoading } =
    recurringHook.useAllRecurringTransactions();

  const { data: accounts = [] } = accountsHook.useAllAccounts();
  const { data: categories = [] } = categoriesHook.useAllCategories();

  const { mutate: deleteTransaction } = recurringHook.deleteRecurringTransaction;
  const { mutate: updateTransaction } = recurringHook.updateRecurringTransaction;

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

  const handleToggleActive = (rt: RecurringTransaction) => {
    updateTransaction({
      id: rt.id,
      data: { isActive: !rt.isActive },
    });
  };

  const handleDelete = () => {
    if (deletingTransactionId) {
      deleteTransaction(deletingTransactionId);
      setDeletingTransactionId(null);
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Cuenta desconocida';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Categoría desconocida';
  };

  if (recurringLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando transacciones recurrentes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="h-7 w-7" />
            Transacciones Recurrentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus ingresos y gastos automáticos
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Recurrente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Transacción Recurrente</DialogTitle>
              <DialogDescription>
                Configura una transacción que se repetirá automáticamente
              </DialogDescription>
            </DialogHeader>
            <RecurringTransactionForm
              orgId={orgId}
              userId={userId}
              onSuccess={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Commitments Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Compromisos</CardTitle>
          <CardDescription>Total estimado de compromisos mensuales activos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            <MoneyDisplay amount={monthlyTotal} type="expense" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {recurringTransactions.filter((rt) => rt.isActive).length} transacciones activas
          </p>
        </CardContent>
      </Card>

      {/* Recurring Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transacciones Recurrentes</CardTitle>
          <CardDescription>
            {recurringTransactions.length === 0
              ? 'No tienes transacciones recurrentes configuradas'
              : `${recurringTransactions.length} transacción${recurringTransactions.length !== 1 ? 'es' : ''} configurada${recurringTransactions.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay transacciones recurrentes</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera transacción recurrente para automatizar tus ingresos o gastos
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Recurrente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Próxima Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringTransactions.map((rt) => (
                    <TableRow key={rt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{FREQUENCY_ICONS[rt.frequency]}</span>
                          <span className="font-medium">{rt.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MoneyDisplay amount={rt.amount} type={rt.type.toLowerCase() as 'income' | 'expense'} />
                      </TableCell>
                      <TableCell>{FREQUENCY_LABELS[rt.frequency]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {getAccountName(rt.accountId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCategoryName(rt.categoryId)}
                      </TableCell>
                      <TableCell>
                        {format(rt.nextOccurrence, 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rt.isActive ? 'default' : 'secondary'}>
                          {rt.isActive ? 'Activa' : 'Pausada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(rt)}
                            title={rt.isActive ? 'Pausar' : 'Reanudar'}
                          >
                            {rt.isActive ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTransaction(rt)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTransactionId(rt.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Transacción Recurrente</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la transacción recurrente
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <RecurringTransactionForm
              orgId={orgId}
              userId={userId}
              initialData={editingTransaction}
              onSuccess={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTransactionId}
        onOpenChange={(open) => !open && setDeletingTransactionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La transacción recurrente será eliminada
              permanentemente y ya no se generarán nuevas transacciones automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
