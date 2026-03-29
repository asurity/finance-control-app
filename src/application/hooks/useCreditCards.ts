/**
 * useCreditCards Hook - Clean Architecture
 * React Query hook for credit card operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { CreditCard } from '@/types/firestore';
import { toast } from 'sonner';

/**
 * Credit card query keys factory
 */
export const creditCardKeys = {
  all: (orgId: string) => ['credit-cards', orgId] as const,
  byId: (orgId: string, cardId: string) => ['credit-cards', orgId, cardId] as const,
  active: (orgId: string) => ['credit-cards', orgId, 'active'] as const,
};

/**
 * Hook for credit card operations
 */
export function useCreditCards(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();
  
  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get repository
  const creditCardRepo = container.getCreditCardRepository();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all credit cards
   */
  const useAllCreditCards = () => {
    return useQuery({
      queryKey: creditCardKeys.all(orgId),
      queryFn: () => creditCardRepo.getAll(),
    });
  };

  /**
   * Query: Get active credit cards
   */
  const useActiveCreditCards = () => {
    return useQuery({
      queryKey: creditCardKeys.active(orgId),
      queryFn: () => creditCardRepo.getActive(),
    });
  };

  /**
   * Query: Get credit card by ID
   */
  const useCreditCardById = (cardId: string) => {
    return useQuery({
      queryKey: creditCardKeys.byId(orgId, cardId),
      queryFn: () => creditCardRepo.getById(cardId),
      enabled: !!cardId,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create credit card
   */
  const createCreditCard = useMutation({
    mutationFn: (data: Omit<CreditCard, 'id'>) => creditCardRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardKeys.all(orgId) });
      // Also invalidate accounts since credit cards might be linked
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      toast.success('Tarjeta de crédito agregada');
    },
    onError: (error: Error) => {
      toast.error(`Error al agregar tarjeta: ${error.message}`);
    },
  });

  /**
   * Mutation: Update credit card
   */
  const updateCreditCard = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditCard> }) =>
      creditCardRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardKeys.all(orgId) });
      toast.success('Tarjeta actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  /**
   * Mutation: Update balance
   */
  const updateBalance = useMutation({
    mutationFn: ({ cardId, amount }: { cardId: string; amount: number }) =>
      creditCardRepo.updateBalance(cardId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar saldo: ${error.message}`);
    },
  });

  /**
   * Mutation: Delete credit card
   */
  const deleteCreditCard = useMutation({
    mutationFn: (id: string) => creditCardRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardKeys.all(orgId) });
      toast.success('Tarjeta eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    // Queries
    useAllCreditCards,
    useActiveCreditCards,
    useCreditCardById,

    
    // Mutations
    createCreditCard,
    updateCreditCard,
    updateBalance,
    deleteCreditCard,
  };
}
