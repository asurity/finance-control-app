'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { QuickExpenseForm } from './QuickExpenseForm';
import { QuickIncomeForm } from './QuickIncomeForm';
import { TransactionForm } from './TransactionForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface QuickTransactionModalProps {
  orgId: string;
  userId: string;
  defaultType?: 'EXPENSE' | 'INCOME';
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost';
}

/**
 * QuickTransactionModal
 * Modal/Sheet inteligente que muestra formularios quick en móvil y desktop
 * Permite cambiar a formulario completo si es necesario
 */
export function QuickTransactionModal({
  orgId,
  userId,
  defaultType = 'EXPENSE',
  triggerLabel = 'Nueva Transacción',
  triggerVariant = 'default',
}: QuickTransactionModalProps) {
  const [open, setOpen] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleSuccess = () => {
    setOpen(false);
    setShowAdvancedForm(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset al cerrar
      setTimeout(() => setShowAdvancedForm(false), 300);
    }
  };

  const title = showAdvancedForm
    ? `Nuevo ${defaultType === 'EXPENSE' ? 'Gasto' : 'Ingreso'} (Completo)`
    : `Registrar ${defaultType === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`;

  const description = showAdvancedForm
    ? 'Formulario completo con todos los campos disponibles'
    : `Formulario rápido para registrar ${defaultType === 'EXPENSE' ? 'gastos' : 'ingresos'} en segundos`;

  const content = (
    <>
      {showAdvancedForm ? (
        <TransactionForm
          orgId={orgId}
          userId={userId}
          onSuccess={handleSuccess}
          defaultType={defaultType}
        />
      ) : defaultType === 'EXPENSE' ? (
        <QuickExpenseForm
          orgId={orgId}
          userId={userId}
          onSuccess={handleSuccess}
          onAdvancedMode={() => setShowAdvancedForm(true)}
        />
      ) : (
        <QuickIncomeForm
          orgId={orgId}
          userId={userId}
          onSuccess={handleSuccess}
          onAdvancedMode={() => setShowAdvancedForm(true)}
        />
      )}
    </>
  );

  const trigger = (
    <Button variant={triggerVariant}>
      <Plus className="mr-2 h-4 w-4" />
      {triggerLabel}
    </Button>
  );

  // Usar Sheet en móvil, Dialog en desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
