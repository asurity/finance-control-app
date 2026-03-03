// useBudgets hook - React Query hooks for budget management
// Budget tracking with spending analysis and threshold alerts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/lib/services/budget.service';
import { TransactionService } from '@/lib/services/transaction.service';
import { Budget, BudgetPeriod } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export function useBudgets() {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new BudgetService(currentOrgId) : null;
const transactionService = currentOrgId ? new TransactionService(currentOrgId) : null;

  // Query: Get active budgets
  const {
    data: budgets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['budgets', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getActive();
    },
    enabled: !!currentOrgId,
  });

  // Query: Get budgets with usage information
  const { data: budgetsWithUsage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['budgets-with-usage', currentOrgId],
    queryFn: async () => {
      if (!service || !transactionService) return [];
      return service.getAllWithUsage(transactionService);
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Create budget
  const createMutation = useMutation({
    mutationFn: (data: Omit<Budget, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Presupuesto creado');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear presupuesto: ${error.message}`);
    },
  });

  // Mutation: Update budget
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Presupuesto actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Delete budget
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!service) throw new Error('Organization not set');
      return service.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', currentOrgId] });
      toast.success('Presupuesto eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    budgets: budgets || [],
    budgetsWithUsage: budgetsWithUsage || [],
    isLoading,
    isLoadingUsage,
    error,
    createBudget: createMutation.mutate,
    updateBudget: updateMutation.mutate,
    deleteBudget: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for budget summary
export function useBudgetSummary() {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['budget-summary', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const budgetService = new BudgetService(currentOrgId);
      const transactionService = new TransactionService(currentOrgId);
      return budgetService.getSummary(transactionService);
    },
    enabled: !!currentOrgId,
  });
}

// Hook for budgets exceeding threshold
export function useBudgetsExceedingThreshold(threshold: number = 80) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['budgets-exceeding-threshold', currentOrgId, threshold],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const budgetService = new BudgetService(currentOrgId);
      const transactionService = new TransactionService(currentOrgId);
      return budgetService.getBudgetsExceedingThreshold(transactionService, threshold);
    },
    enabled: !!currentOrgId,
  });
}
