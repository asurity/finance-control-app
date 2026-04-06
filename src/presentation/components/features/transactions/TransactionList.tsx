'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Receipt, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ResponsiveTable, type ColumnDef } from '@/presentation/components/shared/DataTable';
import { MobileCard } from '@/presentation/components/shared/DataTable';
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

  const renderActions = (transaction: Transaction) => (
    <div className="flex items-center gap-2">
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
  );

  const columns: ColumnDef<Transaction>[] = [
    {
      header: 'Fecha',
      accessor: (t) => (
        <span className="font-medium">
          {format(t.date, 'dd MMM yyyy', { locale: es })}
        </span>
      ),
    },
    {
      header: 'Descripción',
      accessor: (t) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{t.description}</span>
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {t.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
          {t.isInstallment && (
            <Badge variant="outline" className="w-fit text-xs">
              Cuota {t.installmentNumber}/{t.totalInstallments}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Categoría',
      accessor: (t) => (
        <Badge variant={t.type === 'INCOME' ? 'default' : 'secondary'}>
          {categories[t.categoryId] || 'Sin categoría'}
        </Badge>
      ),
    },
    {
      header: 'Cuenta',
      accessor: (t) => (
        <div className="flex items-center gap-2">
          {t.creditCardId && <CreditCard className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm">{accounts[t.accountId] || 'Cuenta desconocida'}</span>
        </div>
      ),
    },
    {
      header: 'Monto',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (t) => (
        <MoneyDisplay
          amount={t.amount}
          type={t.type === 'INCOME' ? 'income' : 'expense'}
          showSign
          size="sm"
        />
      ),
    },
    {
      header: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (t) => renderActions(t),
    },
  ];

  return (
    <div className="rounded-md border sm:border-0">
      <ResponsiveTable
        data={transactions}
        columns={columns}
        keyExtractor={(t) => t.id}
        mobileCard={(transaction) => (
          <MobileCard
            title={transaction.description}
            subtitle={format(transaction.date, 'dd MMM yyyy', { locale: es })}
            badge={
              <MoneyDisplay
                amount={transaction.amount}
                type={transaction.type === 'INCOME' ? 'income' : 'expense'}
                showSign
                size="sm"
              />
            }
            fields={[
              {
                label: 'Categoría',
                value: (
                  <Badge variant={transaction.type === 'INCOME' ? 'default' : 'secondary'} className="text-xs">
                    {categories[transaction.categoryId] || 'Sin categoría'}
                  </Badge>
                ),
              },
              {
                label: 'Cuenta',
                value: accounts[transaction.accountId] || 'Cuenta desconocida',
              },
              ...(transaction.isInstallment
                ? [{
                    label: 'Cuotas',
                    value: `${transaction.installmentNumber}/${transaction.totalInstallments}`,
                  }]
                : []),
            ]}
            actions={renderActions(transaction)}
          />
        )}
      />
    </div>
  );
}
