/**
 * useBudgetPeriods Hook - Clean Architecture
 * React Query hook for budget period operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import {
  CreateBudgetPeriodDTO,
  UpdateBudgetPeriodDTO,
  DeleteBudgetPeriodDTO,
  GetBudgetPeriodDTO,
  ListBudgetPeriodsDTO,
  GetCurrentBudgetPeriodDTO,
  CloneBudgetPeriodDTO,
  CheckPeriodExpirationDTO,
  SuggestCategoryBudgetsDTO,
} from '@/application/dto';
import { handleOptimisticLockError } from '@/lib/utils/optimisticLockErrorHandler';

/**
 * Budget Period query keys factory
 */
export const budgetPeriodKeys = {
  all: (orgId: string) => ['budgetPeriods', orgId] as const,
  byUser: (orgId: string, userId: string) => ['budgetPeriods', orgId, 'user', userId] as const,      
  byId: (orgId: string, id: string) => ['budgetPeriods', orgId, 'detail', id] as const,
  active: (orgId: string, userId: string) => ['budgetPeriods', orgId, 'active', userId] as const,    
  current: (orgId: string, userId: string, date?: Date) =>
    ['budgetPeriods', orgId, 'current', userId, date?.toISOString()] as const,
  byDateRange: (orgId: string, userId: string, startDate?: Date, endDate?: Date) =>
    ['budgetPeriods', orgId, 'dateRange', userId, startDate?.toISOString(), endDate?.toISOString()] as const,
  expiration: (orgId: string, userId: string) => ['budgetPeriods', orgId, 'expiration', userId] as const,
  suggestions: (orgId: string, userId: string, startDate?: Date, endDate?: Date) => 
    ['budgetPeriods', orgId, 'suggestions', userId, startDate?.toISOString(), endDate?.toISOString()] as const,
};

/**
 * Hook for budget period operations
 */
export function useBudgetPeriods(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container (only if valid)
  if (orgId) {
    container.setOrgId(orgId);
  }

  // Queries
  // ========================================

  /**
   * Query: Get all budget periods for organization (shared budgets)
   */
  const useBudgetPeriodsByUser = (userId: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byUser(orgId, userId),
      queryFn: () => {
        const useCase = container.getListBudgetPeriodsUseCase();
        // Query by organizationId to get shared budgets
        return useCase.execute({ organizationId: orgId });
      },
      enabled: !!userId && !!orgId,
    });
  };

  /**
   * Query: Get budget period by ID
   */
  const useBudgetPeriod = (id: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byId(orgId, id),
      queryFn: () => {
        const useCase = container.getGetBudgetPeriodUseCase();
        return useCase.execute({ id });
      },
      enabled: !!id && !!orgId,
    });
  };

  /**
   * Query: Get active budget periods for organization (shared budgets)
   */
  const useActiveBudgetPeriods = (userId: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.active(orgId, userId),
      queryFn: () => {
        const useCase = container.getListBudgetPeriodsUseCase();
        // Query by organizationId to get shared active budgets
        return useCase.execute({ organizationId: orgId, activeOnly: true });
      },
      enabled: !!userId && !!orgId,
    });
  };

  /**
   * Query: Get current budget period for organization (shared budgets)
   */
  const useCurrentBudgetPeriod = (userId: string, date?: Date) => {
    return useQuery({
      queryKey: budgetPeriodKeys.current(orgId, userId, date),
      queryFn: () => {
        const useCase = container.getGetCurrentBudgetPeriodUseCase();
        // Query by organizationId to get shared current budget
        return useCase.execute({ organizationId: orgId, date });
      },
      enabled: !!userId && !!orgId,
    });
  };

  /**
   * Query: Get budget periods within a date range
   */
  const useBudgetPeriodsByDateRange = (userId: string, startDate?: Date, endDate?: Date) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byDateRange(orgId, userId, startDate, endDate),
      queryFn: () => {
        const useCase = container.getListBudgetPeriodsUseCase();
        return useCase.execute({ userId, startDate: startDate!, endDate: endDate! });
      },
      enabled: !!userId && !!startDate && !!endDate && !!orgId,
    });
  };

  /**
   * Query: Check period expiration status
   */
  const usePeriodExpiration = (userId: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.expiration(orgId, userId),
      queryFn: () => {
        const useCase = container.getCheckPeriodExpirationUseCase();
        return useCase.execute({ userId, organizationId: orgId });
      },
      enabled: !!userId && !!orgId,
    });
  };

  /**
   * Query: Suggest category budgets based on previous period length
   */
  const useSuggestedCategories = (userId: string, startDate?: Date, endDate?: Date) => {
    return useQuery({
      queryKey: budgetPeriodKeys.suggestions(orgId, userId, startDate, endDate),
      queryFn: () => {
        const useCase = container.getSuggestCategoryBudgetsUseCase();
        return useCase.execute({ userId, startDate: startDate!, endDate: endDate! });
      },
      enabled: !!userId && !!startDate && !!endDate && !!orgId,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create budget period
   */
  const createBudgetPeriod = useMutation({
    mutationFn: (input: CreateBudgetPeriodDTO) => {
      const useCase = container.getCreateBudgetPeriodUseCase();
      return useCase.execute(input);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byUser(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.active(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.current(orgId, variables.userId) });
    },
  });

  /**
   * Mutation: Update budget period
   */
  const updateBudgetPeriod = useMutation({
    mutationFn: (input: UpdateBudgetPeriodDTO) => {
      const useCase = container.getUpdateBudgetPeriodUseCase();
      return useCase.execute(input);
    },
    onSuccess: (data, variables) => {
      // Invalidate specific budget period
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byId(orgId, variables.id) });
      // Invalidate all lists (user might change)
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.all(orgId) });
      // Also invalidate category budgets as amounts may have been recalculated
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets', orgId] });
    },
    onError: (error) => {
      // Handle optimistic locking errors with user-friendly messages
      handleOptimisticLockError(error);
    },
  });

  /**
   * Mutation: Delete budget period
   */
  const deleteBudgetPeriod = useMutation({
    mutationFn: (input: DeleteBudgetPeriodDTO) => {
      const useCase = container.getDeleteBudgetPeriodUseCase();
      return useCase.execute(input);
    },
    onSuccess: (data, variables) => {
      // Invalidate all budget period queries
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byUser(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.active(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.current(orgId, variables.userId) });
      // Also invalidate category budgets as they were deleted
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets', orgId] });
    },
  });

  /**
   * Mutation: Clone budget period
   */
  const cloneBudgetPeriod = useMutation({
    mutationFn: (input: CloneBudgetPeriodDTO) => {
      const useCase = container.getCloneBudgetPeriodUseCase();
      return useCase.execute(input);
    },
    onSuccess: (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byUser(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.active(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.current(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.expiration(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets', orgId] });
    },
  });

  return {
    // Queries
    useBudgetPeriodsByUser,
    useBudgetPeriod,
    useActiveBudgetPeriods,
    useCurrentBudgetPeriod,
    useBudgetPeriodsByDateRange,
    usePeriodExpiration,
    useSuggestedCategories,
    // Mutations
    createBudgetPeriod,
    updateBudgetPeriod,
    deleteBudgetPeriod,
    cloneBudgetPeriod,
  };
}
