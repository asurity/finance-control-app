// useRecurringTransactions hook - React Query hooks for recurring transactions
// Automated periodic transaction management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecurringTransactionService } from '@/lib/services/recurringTransaction.service';
import { TransactionService } from '@/lib/services/transaction.service';
import { RecurringTransaction } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useRecurringTransactions() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new RecurringTransactionService(currentOrgId) : null;
  const transactionService = currentOrgId ? new TransactionService(currentOrgId) : null;

  // Query: Get all recurring transactions
  const {
    data: recurringTransactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recurring-transactions', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getByUser(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Query: Get active recurring transactions
  const { data: activeRecurring } = useQuery({
    queryKey: ['recurring-transactions-active', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getActive();
    },
    enabled: !!currentOrgId,
  });

  // Query: Get due transactions
  const { data: dueTransactions } = useQuery({
    queryKey: ['recurring-transactions-due', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getDueTransactions();
    },
    enabled: !!currentOrgId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Mutation: Create recurring transaction
  const createMutation = useMutation({
    mutationFn: (data: Omit<RecurringTransaction, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', currentOrgId] });
      toast.success('Transacción recurrente creada');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });

  // Mutation: Update recurring transaction
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringTransaction> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', currentOrgId] });
      toast.success('Transacción recurrente actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Process recurring transaction (create actual transaction)
  const processMutation = useMutation({
    mutationFn: (recurringId: string) => {
      if (!service || !transactionService) throw new Error('Services not initialized');
      return service.processRecurringTransaction(recurringId, transactionService);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success('Transacción procesada');
    },
    onError: (error: Error) => {
      toast.error(`Error al procesar: ${error.message}`);
    },
  });

  // Mutation: Deactivate recurring transaction
  const deactivateMutation = useMutation({
    mutationFn: (recurringId: string) => {
      if (!service) throw new Error('Organization not set');
      return service.deactivate(recurringId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', currentOrgId] });
      toast.success('Transacción recurrente desactivada');
    },
  });

  // Mutation: Reactivate recurring transaction
  const reactivateMutation = useMutation({
    mutationFn: (recurringId: string) => {
      if (!service) throw new Error('Organization not set');
      return service.reactivate(recurringId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions', currentOrgId] });
      toast.success('Transacción recurrente reactivada');
    },
  });

  return {
    recurringTransactions: recurringTransactions || [],
    activeRecurring: activeRecurring || [],
    dueTransactions: dueTransactions || [],
    isLoading,
    error,
    createRecurring: createMutation.mutate,
    updateRecurring: updateMutation.mutate,
    processRecurring: processMutation.mutate,
    deactivate: deactivateMutation.mutate,
    reactivate: reactivateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isProcessing: processMutation.isPending,
  };
}

// Hook for upcoming recurring transactions
export function useUpcomingRecurring(daysAhead: number = 30) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['recurring-transactions-upcoming', currentOrgId, daysAhead],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new RecurringTransactionService(currentOrgId);
      return service.getUpcoming(daysAhead);
    },
    enabled: !!currentOrgId,
  });
}
