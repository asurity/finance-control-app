/**
 * useAccounts Hook - Refactored with Clean Architecture
 * React Query hook for account operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { CreateAccountDTO, UpdateAccountDTO, TransferBetweenAccountsDTO } from '@/application/dto';
import { Account, AccountType } from '@/types/firestore';

/**
 * Account query keys factory
 */
export const accountKeys = {
  all: (orgId: string) => ['accounts', orgId] as const,
  active: (orgId: string) => ['accounts', orgId, 'active'] as const,
  byType: (orgId: string, type: AccountType) => ['accounts', orgId, 'type', type] as const,
  netWorth: (orgId: string) => ['accounts', orgId, 'netWorth'] as const,
  detail: (orgId: string, id: string) => ['accounts', orgId, id] as const,
};

/**
 * Hook for account operations
 */
export function useAccounts(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container (only if valid)
  if (orgId) {
    container.setOrgId(orgId);
  }

  // Get repositories
  const accountRepo = container.getAccountRepository();

  // Get use cases
  const transferUseCase = container.getTransferBetweenAccountsUseCase();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all accounts
   */
  const useAllAccounts = () => {
    return useQuery({
      queryKey: accountKeys.all(orgId),
      queryFn: () => accountRepo.getAll(),
    });
  };

  /**
   * Query: Get active accounts
   */
  const useActiveAccounts = () => {
    return useQuery({
      queryKey: accountKeys.active(orgId),
      queryFn: () => accountRepo.getActive(),
    });
  };

  /**
   * Query: Get accounts by type
   */
  const useAccountsByType = (type: AccountType) => {
    return useQuery({
      queryKey: accountKeys.byType(orgId, type),
      queryFn: () => accountRepo.getByType(type),
    });
  };

  /**
   * Query: Get account by ID
   */
  const useAccountById = (accountId: string) => {
    return useQuery({
      queryKey: accountKeys.detail(orgId, accountId),
      queryFn: () => accountRepo.getById(accountId),
      enabled: !!accountId,
    });
  };

  /**
   * Query: Get net worth
   */
  const useNetWorth = () => {
    return useQuery({
      queryKey: accountKeys.netWorth(orgId),
      queryFn: () => accountRepo.getNetWorth(),
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create account
   */
  const createAccount = useMutation({
    mutationFn: async (input: CreateAccountDTO) => {
      const { id, ...data } = input as CreateAccountDTO & { id?: string };
      return accountRepo.create(data as Omit<Account, 'id'>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.netWorth(orgId) });
    },
  });

  /**
   * Mutation: Update account
   */
  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }: UpdateAccountDTO) => {
      await accountRepo.update(id, data);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.netWorth(orgId) });
    },
  });

  /**
   * Mutation: Delete account
   */
  const deleteAccount = useMutation({
    mutationFn: (accountId: string) => accountRepo.delete(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.netWorth(orgId) });
    },
  });

  /**
   * Mutation: Transfer between accounts
   */
  const transferBetweenAccounts = useMutation({
    mutationFn: (input: TransferBetweenAccountsDTO) => transferUseCase.execute(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.netWorth(orgId) });
      // Also invalidate transactions since transfer creates transactions
      queryClient.invalidateQueries({ queryKey: ['transactions', orgId] });
    },
  });

  /**
   * Mutation: Deactivate account
   */
  const deactivateAccount = useMutation({
    mutationFn: (accountId: string) => accountRepo.deactivate(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.active(orgId) });
    },
  });

  /**
   * Mutation: Reactivate account
   */
  const reactivateAccount = useMutation({
    mutationFn: (accountId: string) => accountRepo.reactivate(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.active(orgId) });
    },
  });

  return {
    // Queries
    useAllAccounts,
    useActiveAccounts,
    useAccountsByType,
    useAccountById,
    useNetWorth,

    // Mutations
    createAccount,
    updateAccount,
    deleteAccount,
    transferBetweenAccounts,
    deactivateAccount,
    reactivateAccount,
  };
}
