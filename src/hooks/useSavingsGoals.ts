// useSavingsGoals hook - React Query hooks for savings goal management
// Track progress, contributions, and achievement of financial goals

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SavingsGoalService,
  SavingsGoalContributionService,
} from '@/lib/services/savingsGoal.service';
import { SavingsGoal, SavingsGoalContribution } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSavingsGoals() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new SavingsGoalService(currentOrgId) : null;
  const contributionService = currentOrgId ? new SavingsGoalContributionService(currentOrgId) : null;

  // Query: Get savings goals
  const {
    data: savingsGoals,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['savings-goals', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getByUser(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Query: Get active goals
  const { data: activeGoals } = useQuery({
    queryKey: ['savings-goals-active', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getActive(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Mutation: Create goal
  const createMutation = useMutation({
    mutationFn: (data: Omit<SavingsGoal, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', currentOrgId] });
      toast.success('Meta de ahorro creada');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear meta: ${error.message}`);
    },
  });

  // Mutation: Update goal
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavingsGoal> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', currentOrgId] });
      toast.success('Meta actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Add contribution
  const addContributionMutation = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) => {
      if (!service || !contributionService) throw new Error('Services not initialized');
      return service.addContribution(goalId, amount, contributionService);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['savings-goal-contributions', currentOrgId] });
      toast.success('Aporte registrado');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar aporte: ${error.message}`);
    },
  });

  // Mutation: Cancel goal
  const cancelMutation = useMutation({
    mutationFn: (goalId: string) => {
      if (!service) throw new Error('Organization not set');
      return service.cancel(goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals', currentOrgId] });
      toast.success('Meta cancelada');
    },
  });

  return {
    savingsGoals: savingsGoals || [],
    activeGoals: activeGoals || [],
    isLoading,
    error,
    createGoal: createMutation.mutate,
    updateGoal: updateMutation.mutate,
    addContribution: addContributionMutation.mutate,
    cancelGoal: cancelMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for single savings goal with calculations
export function useSavingsGoal(goalId: string) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['savings-goal', currentOrgId, goalId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const service = new SavingsGoalService(currentOrgId);
      const goal = await service.getById(goalId);
      if (!goal) return null;

      return {
        ...goal,
        progress: service.calculateProgress(goal),
        remaining: service.calculateRemaining(goal),
        daysRemaining: service.calculateDaysRemaining(goal),
        suggestedContribution: service.calculateSuggestedContribution(goal),
      };
    },
    enabled: !!currentOrgId && !!goalId,
  });
}

// Hook for goal contributions
export function useSavingsGoalContributions(goalId: string) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['savings-goal-contributions', currentOrgId, goalId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new SavingsGoalContributionService(currentOrgId);
      return service.getByGoal(goalId);
    },
    enabled: !!currentOrgId && !!goalId,
  });
}

// Hook for total saved amount
export function useTotalSaved() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['total-saved', currentOrgId, user?.id],
    queryFn: async () => {
      if (!currentOrgId || !user) return 0;
      const service = new SavingsGoalService(currentOrgId);
      return service.getTotalSaved(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });
}

// Hook for goals expiring soon
export function useExpiringSavingsGoals(daysAhead: number = 30) {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expiring-savings-goals', currentOrgId, user?.id, daysAhead],
    queryFn: async () => {
      if (!currentOrgId || !user) return [];
      const service = new SavingsGoalService(currentOrgId);
      return service.getExpiringSoon(user.id, daysAhead);
    },
    enabled: !!currentOrgId && !!user,
  });
}
