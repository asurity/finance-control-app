/**
 * useSavingsGoals Hook - Clean Architecture
 * React Query hook for savings goal operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { SavingsGoal } from '@/types/firestore';
import { toast } from 'sonner';

/**
 * Savings goal query keys factory
 */
export const savingsGoalKeys = {
  all: (orgId: string, userId: string) => ['savings-goals', orgId, userId] as const,
  active: (orgId: string, userId: string) => ['savings-goals', orgId, userId, 'active'] as const,
  byId: (orgId: string, goalId: string) => ['savings-goals', orgId, goalId] as const,
  contributions: (orgId: string, goalId: string) =>
    ['savings-goal-contributions', orgId, goalId] as const,
};

/**
 * Hook for savings goal operations
 */
export function useSavingsGoals(orgId: string, userId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container (only if valid)
  if (orgId) {
    container.setOrgId(orgId);
  }

  // Get repository
  const savingsGoalRepo = container.getSavingsGoalRepository();

  // Get use case for contributions
  const contributeToGoalUseCase = container.getContributeToSavingsGoalUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all savings goals for user
   */
  const useAllSavingsGoals = () => {
    return useQuery({
      queryKey: savingsGoalKeys.all(orgId, userId),
      queryFn: () => savingsGoalRepo.getByUser(userId),
    });
  };

  /**
   * Query: Get active savings goals
   */
  const useActiveSavingsGoals = () => {
    return useQuery({
      queryKey: savingsGoalKeys.active(orgId, userId),
      queryFn: () => savingsGoalRepo.getActive(),
    });
  };

  /**
   * Query: Get savings goal by ID with progress
   */
  const useSavingsGoalById = (goalId: string) => {
    return useQuery({
      queryKey: savingsGoalKeys.byId(orgId, goalId),
      queryFn: async () => {
        const goal = await savingsGoalRepo.getById(goalId);
        if (!goal) return null;

        // Calculate progress
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        return {
          ...goal,
          progress,
          isAchieved: goal.currentAmount >= goal.targetAmount,
        };
      },
      enabled: !!goalId,
    });
  };

  /**
   * Query: Get goal contributions history
   */
  const useGoalContributions = (goalId: string) => {
    return useQuery({
      queryKey: savingsGoalKeys.contributions(orgId, goalId),
      queryFn: () => savingsGoalRepo.getContributions(goalId),
      enabled: !!goalId,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create savings goal
   */
  const createSavingsGoal = useMutation({
    mutationFn: (data: Omit<SavingsGoal, 'id'>) => savingsGoalRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all(orgId, userId) });
      toast.success('Meta de ahorro creada');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear meta: ${error.message}`);
    },
  });

  /**
   * Mutation: Update savings goal
   */
  const updateSavingsGoal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavingsGoal> }) =>
      savingsGoalRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all(orgId, userId) });
      toast.success('Meta actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  /**
   * Mutation: Add contribution to goal
   */
  const addContribution = useMutation({
    mutationFn: ({
      goalId,
      amount,
      fromAccountId,
      note,
    }: {
      goalId: string;
      amount: number;
      fromAccountId: string;
      note?: string;
    }) => contributeToGoalUseCase.execute({ goalId, amount, fromAccountId, userId, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all(orgId, userId) });
      toast.success('Aporte registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar aporte: ${error.message}`);
    },
  });

  /**
   * Mutation: Cancel savings goal
   */
  const cancelSavingsGoal = useMutation({
    mutationFn: (goalId: string) => savingsGoalRepo.cancel(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all(orgId, userId) });
      toast.success('Meta cancelada');
    },
  });

  /**
   * Mutation: Delete savings goal
   */
  const deleteSavingsGoal = useMutation({
    mutationFn: (goalId: string) => savingsGoalRepo.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all(orgId, userId) });
      toast.success('Meta eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    // Queries
    useAllSavingsGoals,
    useActiveSavingsGoals,
    useSavingsGoalById,
    useGoalContributions,

    // Mutations
    createSavingsGoal,
    updateSavingsGoal,
    addContribution,
    cancelSavingsGoal,
    deleteSavingsGoal,
  };
}
