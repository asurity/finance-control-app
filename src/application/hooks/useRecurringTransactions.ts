/**
 * useRecurringTransactions Hook - Clean Architecture
 * React Query hook for recurring transaction operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { RecurringTransaction } from '@/types/firestore';
import { toast } from 'sonner';

/**
 * Recurring transaction query keys factory
 */
export const recurringTransactionKeys = {
  all: (orgId: string, userId: string) => ['recurring-transactions', orgId, userId] as const,
  active: (orgId: string) => ['recurring-transactions', orgId, 'active'] as const,
  due: (orgId: string) => ['recurring-transactions', orgId, 'due'] as const,
};

/**
 * Hook for recurring transaction operations
 */
export function useRecurringTransactions(orgId: string, userId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get repository
  const recurringRepo = container.getRecurringTransactionRepository();

  // Get use case for processing
  const processRecurringUseCase = container.getProcessRecurringTransactionsUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all recurring transactions (active ones)
   */
  const useAllRecurringTransactions = () => {
    return useQuery({
      queryKey: recurringTransactionKeys.all(orgId, userId),
      queryFn: () => recurringRepo.getActive(),
    });
  };

  /**
   * Query: Get active recurring transactions
   */
  const useActiveRecurringTransactions = () => {
    return useQuery({
      queryKey: recurringTransactionKeys.active(orgId),
      queryFn: () => recurringRepo.getActive(),
    });
  };

  /**
   * Query: Get due transactions (need to be processed)
   */
  const useDueRecurringTransactions = () => {
    return useQuery({
      queryKey: recurringTransactionKeys.due(orgId),
      queryFn: () => recurringRepo.getDueForProcessing(new Date()),
      refetchInterval: 60000, // Refetch every minute
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create recurring transaction
   */
  const createRecurringTransaction = useMutation({
    mutationFn: (data: Omit<RecurringTransaction, 'id'>) => recurringRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTransactionKeys.all(orgId, userId) });
      toast.success('Transacción recurrente creada');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });

  /**
   * Mutation: Update recurring transaction
   */
  const updateRecurringTransaction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringTransaction> }) =>
      recurringRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTransactionKeys.all(orgId, userId) });
      toast.success('Transacción recurrente actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  /**
   * Mutation: Process recurring transaction (create actual transaction)
   */
  const processRecurringTransaction = useMutation({
    mutationFn: (recurringId: string) =>
      processRecurringUseCase.execute({ currentDate: new Date() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTransactionKeys.all(orgId, userId) });
      queryClient.invalidateQueries({ queryKey: ['transactions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      toast.success('Transacción procesada');
    },
    onError: (error: Error) => {
      toast.error(`Error al procesar: ${error.message}`);
    },
  });

  /**
   * Mutation: Pause recurring transaction
   */
  const pauseRecurringTransaction = useMutation({
    mutationFn: (id: string) => recurringRepo.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTransactionKeys.all(orgId, userId) });
      toast.success('Transacción recurrente pausada');
    },
  });

  /**
   * Mutation: Delete recurring transaction
   */
  const deleteRecurringTransaction = useMutation({
    mutationFn: (id: string) => recurringRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringTransactionKeys.all(orgId, userId) });
      toast.success('Transacción recurrente eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    // Queries
    useAllRecurringTransactions,
    useActiveRecurringTransactions,
    useDueRecurringTransactions,

    // Mutations
    createRecurringTransaction,
    updateRecurringTransaction,
    processRecurringTransaction,
    pauseRecurringTransaction,
    deleteRecurringTransaction,
  };
}
