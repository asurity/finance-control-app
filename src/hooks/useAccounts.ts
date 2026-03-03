// useAccounts hook - React Query hooks for account management
// Enhanced with credit card support and balance updates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountService } from '@/lib/services/account.service';
import { Account } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export function useAccounts() {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new AccountService(currentOrgId) : null;

  // Query: Get all active accounts
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['accounts', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getActive();
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Create account
  const createMutation = useMutation({
    mutationFn: (data: Omit<Account, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success('Cuenta creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cuenta: ${error.message}`);
    },
  });

  // Mutation: Update account
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success('Cuenta actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Delete account
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!service) throw new Error('Organization not set');
      return service.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success('Cuenta eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  // Mutation: Transfer between accounts
  const transferMutation = useMutation({
    mutationFn: ({ from, to, amount }: { from: string; to: string; amount: number }) => {
      if (!service) throw new Error('Organization not set');
      return service.transfer(from, to, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentOrgId] });
      toast.success('Transferencia realizada');
    },
    onError: (error: Error) => {
      toast.error(`Error en transferencia: ${error.message}`);
    },
  });

  return {
    accounts: accounts || [],
    isLoading,
    error,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    transfer: transferMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTransferring: transferMutation.isPending,
  };
}

// Hook for net worth calculation
export function useNetWorth() {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['net-worth', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const service = new AccountService(currentOrgId);
      return service.getNetWorth();
    },
    enabled: !!currentOrgId,
  });
}

// Hook for accounts by type
export function useAccountsByType(type: Account['type']) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['accounts-by-type', currentOrgId, type],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new AccountService(currentOrgId);
      return service.getByType(type);
    },
    enabled: !!currentOrgId,
  });
}

// Hook for credit card accounts
export function useCreditCardAccounts() {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['credit-card-accounts', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new AccountService(currentOrgId);
      return service.getCreditCards();
    },
    enabled: !!currentOrgId,
  });
}
