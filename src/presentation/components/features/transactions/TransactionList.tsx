'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Receipt, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/firestore';
import { useTransactions } from '@/application/hooks/useTransactions';
import { toast } from 'sonner';

interface TransactionListProps {
  orgId: string;
  transactions: Transaction[];
  categories: Record<string, string>; // categoryId -> categoryName
  accounts: Record<string, string>; // accountId -> accountName
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({
  orgId,
  transactions,
  categories,
  accounts,
  onEdit,
}: TransactionListProps) {
  const { deleteTransaction } = useTransactions(orgId);

  const handleDelete = async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync({ id: transactionId });
      toast.success('Transacción eliminada exitosamente');
    } catch (error: any) {
      console.error('Error al eliminar transacción:', error);
      toast.error('Error al eliminar transacción', {
        description: error.message || 'Por favor, inténtalo de nuevo',
      });
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No hay transacciones registradas
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Comienza agregando tu primera transacción
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              {/* Date */}
              <TableCell className="font-medium">
                {format(transaction.date, 'dd MMM yyyy', { locale: es })}
              </TableCell>

              {/* Description */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{transaction.description}</span>
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {transaction.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {transaction.isInstallment && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Cuota {transaction.installmentNumber}/{transaction.totalInstallments}
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Category */}
              <TableCell>
                <Badge variant={transaction.type === 'INCOME' ? 'default' : 'secondary'}>
                  {categories[transaction.categoryId] || 'Sin categoría'}
                </Badge>
              </TableCell>

              {/* Account */}
              <TableCell>
                <div className="flex items-center gap-2">
                  {transaction.creditCardId && (
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {accounts[transaction.accountId] || 'Cuenta desconocida'}
                  </span>
                </div>
              </TableCell>

              {/* Amount */}
              <TableCell className="text-right">
                <MoneyDisplay
                  amount={transaction.amount}
                  type={transaction.type === 'INCOME' ? 'income' : 'expense'}
                  showSign
                  size="sm"
                />
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {transaction.receiptUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(transaction.receiptUrl, '_blank')}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}

                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={deleteTransaction.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará permanentemente la
                          transacción y se actualizará el balance de la cuenta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(transaction.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
