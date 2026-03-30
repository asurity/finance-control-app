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
} from '@/application/dto';

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
  byDateRange: (orgId: string, userId: string, startDate: Date, endDate: Date) => 
    ['budgetPeriods', orgId, 'dateRange', userId, startDate.toISOString(), endDate.toISOString()] as const,
};

/**
 * Hook for budget period operations
 */
export function useBudgetPeriods(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get use cases
  const createBudgetPeriodUseCase = container.getCreateBudgetPeriodUseCase();
  const updateBudgetPeriodUseCase = container.getUpdateBudgetPeriodUseCase();
  const deleteBudgetPeriodUseCase = container.getDeleteBudgetPeriodUseCase();
  const getBudgetPeriodUseCase = container.getGetBudgetPeriodUseCase();
  const listBudgetPeriodsUseCase = container.getListBudgetPeriodsUseCase();
  const getCurrentBudgetPeriodUseCase = container.getGetCurrentBudgetPeriodUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all budget periods for a user
   */
  const useBudgetPeriodsByUser = (userId: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byUser(orgId, userId),
      queryFn: () => listBudgetPeriodsUseCase.execute({ userId }),
      enabled: !!userId,
    });
  };

  /**
   * Query: Get budget period by ID
   */
  const useBudgetPeriod = (id: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byId(orgId, id),
      queryFn: () => getBudgetPeriodUseCase.execute({ id }),
      enabled: !!id,
    });
  };

  /**
   * Query: Get active budget periods for a user
   */
  const useActiveBudgetPeriods = (userId: string) => {
    return useQuery({
      queryKey: budgetPeriodKeys.active(orgId, userId),
      queryFn: () => listBudgetPeriodsUseCase.execute({ userId, activeOnly: true }),
      enabled: !!userId,
    });
  };

  /**
   * Query: Get current budget period for a user
   */
  const useCurrentBudgetPeriod = (userId: string, date?: Date) => {
    return useQuery({
      queryKey: budgetPeriodKeys.current(orgId, userId, date),
      queryFn: () => getCurrentBudgetPeriodUseCase.execute({ userId, date }),
      enabled: !!userId,
    });
  };

  /**
   * Query: Get budget periods within a date range
   */
  const useBudgetPeriodsByDateRange = (userId: string, startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: budgetPeriodKeys.byDateRange(orgId, userId, startDate, endDate),
      queryFn: () => listBudgetPeriodsUseCase.execute({ userId, startDate, endDate }),
      enabled: !!userId && !!startDate && !!endDate,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create budget period
   */
  const createBudgetPeriod = useMutation({
    mutationFn: (input: CreateBudgetPeriodDTO) => createBudgetPeriodUseCase.execute(input),
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
    mutationFn: (input: UpdateBudgetPeriodDTO) => updateBudgetPeriodUseCase.execute(input),
    onSuccess: (data, variables) => {
      // Invalidate specific budget period
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byId(orgId, variables.id) });
      // Invalidate all lists (user might change)
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.all(orgId) });
      // Also invalidate category budgets as amounts may have been recalculated
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets', orgId] });
    },
  });

  /**
   * Mutation: Delete budget period
   */
  const deleteBudgetPeriod = useMutation({
    mutationFn: (input: DeleteBudgetPeriodDTO) => deleteBudgetPeriodUseCase.execute(input),
    onSuccess: (data, variables) => {
      // Invalidate all budget period queries
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.byUser(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.active(orgId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: budgetPeriodKeys.current(orgId, variables.userId) });
      // Also invalidate category budgets as they were deleted
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
    // Mutations
    createBudgetPeriod,
    updateBudgetPeriod,
    deleteBudgetPeriod,
  };
}
