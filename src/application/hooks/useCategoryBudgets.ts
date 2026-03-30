/**
 * useCategoryBudgets Hook - Clean Architecture
 * React Query hook for category budget operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import {
  SetCategoryBudgetDTO,
  UpdateCategoryBudgetPercentageDTO,
  DeleteCategoryBudgetDTO,
  GetCategoryBudgetStatusDTO,
  GetBudgetPeriodSummaryDTO,
  ListCategoryBudgetsDTO,
} from '@/application/dto';

/**
 * Category Budget query keys factory
 */
export const categoryBudgetKeys = {
  all: (orgId: string) => ['categoryBudgets', orgId] as const,
  byBudgetPeriod: (orgId: string, budgetPeriodId: string) => 
    ['categoryBudgets', orgId, 'budgetPeriod', budgetPeriodId] as const,
  byCategory: (orgId: string, categoryId: string) => 
    ['categoryBudgets', orgId, 'category', categoryId] as const,
  byUser: (orgId: string, userId: string) => 
    ['categoryBudgets', orgId, 'user', userId] as const,
  status: (orgId: string, id: string) => 
    ['categoryBudgets', orgId, 'status', id] as const,
  summary: (orgId: string, budgetPeriodId: string) => 
    ['categoryBudgets', orgId, 'summary', budgetPeriodId] as const,
};

/**
 * Hook for category budget operations
 */
export function useCategoryBudgets(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get use cases
  const setCategoryBudgetUseCase = container.getSetCategoryBudgetUseCase();
  const updateCategoryBudgetPercentageUseCase = container.getUpdateCategoryBudgetPercentageUseCase();
  const deleteCategoryBudgetUseCase = container.getDeleteCategoryBudgetUseCase();
  const getCategoryBudgetStatusUseCase = container.getGetCategoryBudgetStatusUseCase();
  const getBudgetPeriodSummaryUseCase = container.getGetBudgetPeriodSummaryUseCase();
  const listCategoryBudgetsUseCase = container.getListCategoryBudgetsUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get category budgets by budget period
   */
  const useCategoryBudgetsByPeriod = (budgetPeriodId: string) => {
    return useQuery({
      queryKey: categoryBudgetKeys.byBudgetPeriod(orgId, budgetPeriodId),
      queryFn: () => listCategoryBudgetsUseCase.execute({ budgetPeriodId }),
      enabled: !!budgetPeriodId,
    });
  };

  /**
   * Query: Get category budgets by category
   */
  const useCategoryBudgetsByCategory = (categoryId: string) => {
    return useQuery({
      queryKey: categoryBudgetKeys.byCategory(orgId, categoryId),
      queryFn: () => listCategoryBudgetsUseCase.execute({ categoryId }),
      enabled: !!categoryId,
    });
  };

  /**
   * Query: Get category budgets by user
   */
  const useCategoryBudgetsByUser = (userId: string) => {
    return useQuery({
      queryKey: categoryBudgetKeys.byUser(orgId, userId),
      queryFn: () => listCategoryBudgetsUseCase.execute({ userId }),
      enabled: !!userId,
    });
  };

  /**
   * Query: Get category budget status
   */
  const useCategoryBudgetStatus = (id: string) => {
    return useQuery({
      queryKey: categoryBudgetKeys.status(orgId, id),
      queryFn: () => getCategoryBudgetStatusUseCase.execute({ id }),
      enabled: !!id,
    });
  };

  /**
   * Query: Get budget period summary
   */
  const useBudgetPeriodSummary = (budgetPeriodId: string) => {
    return useQuery({
      queryKey: categoryBudgetKeys.summary(orgId, budgetPeriodId),
      queryFn: () => getBudgetPeriodSummaryUseCase.execute({ budgetPeriodId }),
      enabled: !!budgetPeriodId,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Set category budget
   */
  const setCategoryBudget = useMutation({
    mutationFn: (input: SetCategoryBudgetDTO) => setCategoryBudgetUseCase.execute(input),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: categoryBudgetKeys.byBudgetPeriod(orgId, variables.budgetPeriodId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: categoryBudgetKeys.summary(orgId, variables.budgetPeriodId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: categoryBudgetKeys.byCategory(orgId, variables.categoryId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: categoryBudgetKeys.byUser(orgId, variables.userId) 
      });
    },
  });

  /**
   * Mutation: Update category budget percentage
   */
  const updateCategoryBudgetPercentage = useMutation({
    mutationFn: (input: UpdateCategoryBudgetPercentageDTO) => 
      updateCategoryBudgetPercentageUseCase.execute(input),
    onSuccess: (data, variables) => {
      // Invalidate specific status
      queryClient.invalidateQueries({ queryKey: categoryBudgetKeys.status(orgId, variables.id) });
      // Invalidate all lists that might contain this budget
      queryClient.invalidateQueries({ queryKey: categoryBudgetKeys.all(orgId) });
    },
  });

  /**
   * Mutation: Delete category budget
   */
  const deleteCategoryBudget = useMutation({
    mutationFn: (input: DeleteCategoryBudgetDTO) => deleteCategoryBudgetUseCase.execute(input),
    onSuccess: () => {
      // Invalidate all category budget queries
      queryClient.invalidateQueries({ queryKey: categoryBudgetKeys.all(orgId) });
    },
  });

  return {
    // Queries
    useCategoryBudgetsByPeriod,
    useCategoryBudgetsByCategory,
    useCategoryBudgetsByUser,
    useCategoryBudgetStatus,
    useBudgetPeriodSummary,
    // Mutations
    setCategoryBudget,
    updateCategoryBudgetPercentage,
    deleteCategoryBudget,
  };
}
