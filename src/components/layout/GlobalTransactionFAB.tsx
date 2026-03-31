'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { QuickExpenseForm } from '@/presentation/components/features/transactions/QuickExpenseForm';
import { QuickIncomeForm } from '@/presentation/components/features/transactions/QuickIncomeForm';
import { TransactionForm } from '@/presentation/components/features/transactions/TransactionForm';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * GlobalTransactionFAB
 * Floating Action Button global para crear transacciones desde cualquier página
 * Solo visible en móviles (< lg)
 * Optimizado para móvil con formularios quick y opción de formulario completo
 */
export function GlobalTransactionFAB() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [incomeSheetOpen, setIncomeSheetOpen] = useState(false);
  const [showAdvancedExpenseForm, setShowAdvancedExpenseForm] = useState(false);
  const [showAdvancedIncomeForm, setShowAdvancedIncomeForm] = useState(false);

  // No renderizar si no hay usuario u organización
  if (!user || !currentOrgId) {
    return null;
  }

  const handleExpenseSuccess = () => {
    setExpenseSheetOpen(false);
    setShowAdvancedExpenseForm(false);
  };

  const handleIncomeSuccess = () => {
    setIncomeSheetOpen(false);
    setShowAdvancedIncomeForm(false);
  };

  const handleExpenseSheetChange = (open: boolean) => {
    setExpenseSheetOpen(open);
    if (!open) {
      // Reset al cerrar
      setTimeout(() => setShowAdvancedExpenseForm(false), 300);
    }
  };

  const handleIncomeSheetChange = (open: boolean) => {
    setIncomeSheetOpen(open);
    if (!open) {
      // Reset al cerrar
      setTimeout(() => setShowAdvancedIncomeForm(false), 300);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <FloatingActionButton
        onExpenseClick={() => setExpenseSheetOpen(true)}
        onIncomeClick={() => setIncomeSheetOpen(true)}
      />

      {/* Sheet para nuevo gasto - Optimizado para móvil */}
      <Sheet open={expenseSheetOpen} onOpenChange={handleExpenseSheetChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {showAdvancedExpenseForm ? 'Nuevo Gasto (Completo)' : 'Registrar Gasto'}
            </SheetTitle>
            <SheetDescription>
              {showAdvancedExpenseForm
                ? 'Formulario completo con todos los campos disponibles'
                : 'Formulario rápido para registrar gastos en segundos'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {showAdvancedExpenseForm ? (
              <TransactionForm
                orgId={currentOrgId}
                userId={user.id}
                onSuccess={handleExpenseSuccess}
                defaultType="EXPENSE"
              />
            ) : (
              <QuickExpenseForm
                orgId={currentOrgId}
                userId={user.id}
                onSuccess={handleExpenseSuccess}
                onAdvancedMode={() => setShowAdvancedExpenseForm(true)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet para nuevo ingreso - Optimizado para móvil */}
      <Sheet open={incomeSheetOpen} onOpenChange={handleIncomeSheetChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {showAdvancedIncomeForm ? 'Nuevo Ingreso (Completo)' : 'Registrar Ingreso'}
            </SheetTitle>
            <SheetDescription>
              {showAdvancedIncomeForm
                ? 'Formulario completo con todos los campos disponibles'
                : 'Formulario rápido para registrar ingresos en segundos'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {showAdvancedIncomeForm ? (
              <TransactionForm
                orgId={currentOrgId}
                userId={user.id}
                onSuccess={handleIncomeSuccess}
                defaultType="INCOME"
              />
            ) : (
              <QuickIncomeForm
                orgId={currentOrgId}
                userId={user.id}
                onSuccess={handleIncomeSuccess}
                onAdvancedMode={() => setShowAdvancedIncomeForm(true)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
