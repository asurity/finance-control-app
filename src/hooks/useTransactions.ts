// useTransactions hook - React Query hooks for transaction management
// Provides queries and mutations for all transaction operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionService } from '@/lib/services/transaction.service';
import { Transaction } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export function useTransactions(dateRange?: { start: Date; end: Date }) {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new TransactionService(currentOrgId) : null;

  // Query: Get all transactions
  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transactions', currentOrgId, dateRange],
    queryFn: async () => {
      if (!service) return [];
      if (dateRange) {
        return service.getByDateRange(dateRange.start, dateRange.end);
      }
      return service.getAll();
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Create transaction
  const createMutation = useMutation({
    mutationFn: (data: Omit<Transaction, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Transacción creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear transacción: ${error.message}`);
    },
  });

  // Mutation: Update transaction
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Transacción actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Delete transaction
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!service) throw new Error('Organization not set');
      return service.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Transacción eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  // Mutation: Create installment transaction
  const createInstallmentMutation = useMutation({
    mutationFn: ({
      transaction,
      installments,
    }: {
      transaction: Omit<Transaction, 'id'>;
      installments: number;
    }) => {
      if (!service) throw new Error('Organization not set');
      return service.createInstallmentTransaction(transaction, installments);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success(`${variables.installments} cuotas creadas exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cuotas: ${error.message}`);
    },
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
    createTransaction: createMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    createInstallmentTransaction: createInstallmentMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for transaction statistics
export function useTransactionStatistics(startDate: Date, endDate: Date) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['transaction-statistics', currentOrgId, startDate, endDate],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const service = new TransactionService(currentOrgId);
      return service.getStatistics(startDate, endDate);
    },
    enabled: !!currentOrgId,
  });
}

// Hook for transactions by category
export function useTransactionsByCategory(categoryId: string) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['transactions-by-category', currentOrgId, categoryId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new TransactionService(currentOrgId);
      return service.getByCategory(categoryId);
    },
    enabled: !!currentOrgId && !!categoryId,
  });
}

// Hook for transactions by account
export function useTransactionsByAccount(accountId: string) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['transactions-by-account', currentOrgId, accountId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new TransactionService(currentOrgId);
      return service.getByAccount(accountId);
    },
    enabled: !!currentOrgId && !!accountId,
  });
}
