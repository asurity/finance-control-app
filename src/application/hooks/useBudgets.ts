/**
 * useBudgets Hook - Refactored with Clean Architecture
 * React Query hook for budget operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { CreateBudgetDTO, UpdateBudgetDTO } from '@/application/dto';
import { Budget, BudgetPeriod } from '@/types/firestore';

/**
 * Budget query keys factory
 */
export const budgetKeys = {
  all: (orgId: string) => ['budgets', orgId] as const,
  active: (orgId: string) => ['budgets', orgId, 'active'] as const,
  byPeriod: (orgId: string, period: BudgetPeriod) => ['budgets', orgId, 'period', period] as const,
  usage: (orgId: string, budgetId: string) => ['budgets', orgId, 'usage', budgetId] as const,
  detail: (orgId: string, id: string) => ['budgets', orgId, id] as const,
};

/**
 * Hook for budget operations
 */
export function useBudgets(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();
  
  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get repositories
  const budgetRepo = container.getBudgetRepository();

  // Get use cases
  const calculateUsageUseCase = container.getCalculateBudgetUsageUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all budgets
   */
  const useAllBudgets = () => {
    return useQuery({
      queryKey: budgetKeys.all(orgId),
      queryFn: () => budgetRepo.getAll(),
    });
  };

  /**
   * Query: Get active budgets
   */
  const useActiveBudgets = () => {
    return useQuery({
      queryKey: budgetKeys.active(orgId),
      queryFn: () => budgetRepo.getActive(new Date()),
    });
  };

  /**
   * Query: Get budgets by period
   */
  const useBudgetsByPeriod = (period: BudgetPeriod) => {
    return useQuery({
      queryKey: budgetKeys.byPeriod(orgId, period),
      queryFn: () => budgetRepo.getByPeriod(period),
    });
  };

  /**
   * Query: Get budget by ID
   */
  const useBudgetById = (budgetId: string) => {
    return useQuery({
      queryKey: budgetKeys.detail(orgId, budgetId),
      queryFn: () => budgetRepo.getById(budgetId),
      enabled: !!budgetId,
    });
  };

  /**
   * Query: Calculate budget usage
   */
  const useBudgetUsage = (budgetId: string) => {
    return useQuery({
      queryKey: budgetKeys.usage(orgId, budgetId),
      queryFn: () => calculateUsageUseCase.execute({ budgetId }),
      enabled: !!budgetId,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create budget
   */
  const createBudget = useMutation({
    mutationFn: async (input: CreateBudgetDTO) => {
      const { id, ...data } = input as CreateBudgetDTO & { id?: string };
      return budgetRepo.create(data as Omit<Budget, 'id'>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.active(orgId) });
    },
  });

  /**
   * Mutation: Update budget
   */
  const updateBudget = useMutation({
    mutationFn: async ({ id, ...data }: UpdateBudgetDTO) => {
      await budgetRepo.update(id, data);
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.active(orgId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.usage(orgId, variables.id) });
    },
  });

  /**
   * Mutation: Delete budget
   */
  const deleteBudget = useMutation({
    mutationFn: (budgetId: string) => budgetRepo.delete(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.active(orgId) });
    },
  });

  return {
    // Queries
    useAllBudgets,
    useActiveBudgets,
    useBudgetsByPeriod,
    useBudgetById,
    useBudgetUsage,
    
    // Mutations
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
