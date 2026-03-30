/**
 * useTransactions Hook - Refactored with Clean Architecture
 * React Query hook for transaction operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { CreateTransactionDTO, DeleteTransactionDTO } from '@/application/dto';
import { Transaction } from '@/types/firestore';

/**
 * Transaction query keys factory
 */
export const transactionKeys = {
  all: (orgId: string) => ['transactions', orgId] as const,
  byDateRange: (orgId: string, startDate: Date, endDate: Date) => 
    ['transactions', orgId, 'dateRange', startDate.toISOString(), endDate.toISOString()] as const,
  byAccount: (orgId: string, accountId: string) => 
    ['transactions', orgId, 'account', accountId] as const,
  byCategory: (orgId: string, categoryId: string) => 
    ['transactions', orgId, 'category', categoryId] as const,
  statistics: (orgId: string, startDate: Date, endDate: Date) => 
    ['transactions', orgId, 'statistics', startDate.toISOString(), endDate.toISOString()] as const,
};

/**
 * Hook for transaction operations
 */
export function useTransactions(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();
  
  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get repositories
  const transactionRepo = container.getTransactionRepository();

  // Get use cases
  const createTransactionUseCase = container.getCreateTransactionUseCase();
  const deleteTransactionUseCase = container.getDeleteTransactionUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all transactions
   */
  const useAllTransactions = () => {
    return useQuery({
      queryKey: transactionKeys.all(orgId),
      queryFn: () => transactionRepo.getAll(),
    });
  };

  /**
   * Query: Get transactions by date range
   */
  const useTransactionsByDateRange = (startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: transactionKeys.byDateRange(orgId, startDate, endDate),
      queryFn: () => transactionRepo.getByDateRange(startDate, endDate),
    });
  };

  /**
   * Query: Get transactions by account
   */
  const useTransactionsByAccount = (accountId: string) => {
    return useQuery({
      queryKey: transactionKeys.byAccount(orgId, accountId),
      queryFn: () => transactionRepo.getByAccount(accountId),
      enabled: !!accountId,
    });
  };

  /**
   * Query: Get transactions by category
   */
  const useTransactionsByCategory = (categoryId: string) => {
    return useQuery({
      queryKey: transactionKeys.byCategory(orgId, categoryId),
      queryFn: () => transactionRepo.getByCategory(categoryId),
      enabled: !!categoryId,
    });
  };

  /**
   * Query: Get transaction statistics
   */
  const useTransactionStatistics = (startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: transactionKeys.statistics(orgId, startDate, endDate),
      queryFn: () => transactionRepo.getStatistics(startDate, endDate),
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create transaction
   */
  const createTransaction = useMutation({
    mutationFn: (input: CreateTransactionDTO) => createTransactionUseCase.execute(input),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(orgId) });
      // Also invalidate related views since balances and aggregates changed
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-periods', orgId] });
      queryClient.invalidateQueries({ queryKey: ['category-budgets', orgId] });
    },
  });

  /**
   * Mutation: Delete transaction
   */
  const deleteTransaction = useMutation({
    mutationFn: (input: DeleteTransactionDTO) => 
      deleteTransactionUseCase.execute({ transactionId: input.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-periods', orgId] });
      queryClient.invalidateQueries({ queryKey: ['category-budgets', orgId] });
    },
  });

  /**
   * Mutation: Update transaction
   */
  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      await transactionRepo.update(id, data);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-periods', orgId] });
      queryClient.invalidateQueries({ queryKey: ['category-budgets', orgId] });
    },
  });

  return {
    // Queries
    useAllTransactions,
    useTransactionsByDateRange,
    useTransactionsByAccount,
    useTransactionsByCategory,
    useTransactionStatistics,
    
    // Mutations
    createTransaction,
    deleteTransaction,
    updateTransaction,
  };
}
