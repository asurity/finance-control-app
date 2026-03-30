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
import { Button } from '@/components/ui/button';
import { TransactionForm } from './TransactionForm';

interface QuickTransactionModalProps {
  orgId: string;
  userId: string;
}

export function QuickTransactionModal({ orgId, userId }: QuickTransactionModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Transacción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Transacción</DialogTitle>
          <DialogDescription>
            Completa los datos de la transacción. Los campos marcados son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm 
          orgId={orgId} 
          userId={userId} 
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
