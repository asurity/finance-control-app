// useCreditCards hook - React Query hooks for credit card management
// Complete credit card operations with interest calculation and statements

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCardService, CreditCardStatementService } from '@/lib/services/creditCard.service';
import { CreditCard, CreditCardStatement } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export function useCreditCards() {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new CreditCardService(currentOrgId) : null;

  // Query: Get all credit cards
  const {
    data: creditCards,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['credit-cards', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getActiveCards();
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Create credit card
  const createMutation = useMutation({
    mutationFn: (data: Omit<CreditCard, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
      toast.success('Tarjeta de crédito agregada');
    },
    onError: (error: Error) => {
      toast.error(`Error al agregar tarjeta: ${error.message}`);
    },
  });

  // Mutation: Update credit card
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditCard> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentOrgId] });
      toast.success('Tarjeta actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Update balance
  const updateBalanceMutation = useMutation({
    mutationFn: ({ cardId, amount }: { cardId: string; amount: number }) => {
      if (!service) throw new Error('Organization not set');
      return service.updateBalance(cardId, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrgId] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar saldo: ${error.message}`);
    },
  });

  return {
    creditCards: creditCards || [],
    isLoading,
    error,
    createCreditCard: createMutation.mutate,
    updateCreditCard: updateMutation.mutate,
    updateBalance: updateBalanceMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for single credit card with calculated fields
export function useCreditCard(cardId: string) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['credit-card', currentOrgId, cardId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const service = new CreditCardService(currentOrgId);
      const card = await service.getById(cardId);
      if (!card) return null;

      // Calculate additional fields
      const minimumPayment = await service.calculateMinimumPayment(cardId);
      const monthlyInterest = await service.calculateInterest(cardId);
      const utilizationPercent = await service.getUtilizationPercent(cardId);
      const nextCutoffDate = service.getNextCutoffDate(card);
      const nextPaymentDueDate = service.getNextPaymentDueDate(card);

      return {
        ...card,
        minimumPayment,
        monthlyInterest,
        utilizationPercent,
        nextCutoffDate,
        nextPaymentDueDate,
      };
    },
    enabled: !!currentOrgId && !!cardId,
  });
}

// Hook for credit card statements
export function useCreditCardStatements(cardId?: string) {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new CreditCardStatementService(currentOrgId) : null;

  // Query: Get statements
  const {
    data: statements,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['credit-card-statements', currentOrgId, cardId],
    queryFn: async () => {
      if (!service) return [];
      if (cardId) {
        return service.getByCard(cardId);
      }
      return service.getAll();
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Mark statement as paid
  const markAsPaidMutation = useMutation({
    mutationFn: ({ statementId, amount }: { statementId: string; amount: number }) => {
      if (!service) throw new Error('Organization not set');
      return service.markAsPaid(statementId, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-statements', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentOrgId] });
      toast.success('Pago registrado');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar pago: ${error.message}`);
    },
  });

  return {
    statements: statements || [],
    isLoading,
    error,
    markAsPaid: markAsPaidMutation.mutate,
    isMarkingPaid: markAsPaidMutation.isPending,
  };
}

// Hook for upcoming statements
export function useUpcomingStatements(daysAhead: number = 7) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['upcoming-statements', currentOrgId, daysAhead],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new CreditCardStatementService(currentOrgId);
      return service.getUpcomingStatements(daysAhead);
    },
    enabled: !!currentOrgId,
  });
}
