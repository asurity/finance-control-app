'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { TransactionForm } from '@/presentation/components/features/transactions/TransactionForm';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * GlobalTransactionFAB
 * Floating Action Button global para crear transacciones desde cualquier página
 * Solo visible en móviles (< lg)
 */
export function GlobalTransactionFAB() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);

  // No renderizar si no hay usuario u organización
  if (!user || !currentOrgId) {
    return null;
  }

  const handleExpenseSuccess = () => {
    setExpenseDialogOpen(false);
  };

  const handleIncomeSuccess = () => {
    setIncomeDialogOpen(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <FloatingActionButton
        onExpenseClick={() => setExpenseDialogOpen(true)}
        onIncomeClick={() => setIncomeDialogOpen(true)}
      />

      {/* Diálogo para nuevo gasto */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
            <DialogDescription>
              Registra un gasto. Los campos marcados son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            orgId={currentOrgId}
            userId={user.id}
            onSuccess={handleExpenseSuccess}
            defaultType="EXPENSE"
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo para nuevo ingreso */}
      <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso</DialogTitle>
            <DialogDescription>
              Registra un ingreso. Los campos marcados son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            orgId={currentOrgId}
            userId={user.id}
            onSuccess={handleIncomeSuccess}
            defaultType="INCOME"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
