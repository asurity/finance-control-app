/**
 * useAlerts Hook - Clean Architecture
 * React Query hook for alert operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { Alert } from '@/types/firestore';
import { toast } from 'sonner';

/**
 * Alert query keys factory
 */
export const alertKeys = {
  all: (orgId: string, userId: string) => ['alerts', orgId, userId] as const,
  unread: (orgId: string) => ['alerts', orgId, 'unread'] as const,
};

/**
 * Hook for alert operations
 */
export function useAlerts(orgId: string, userId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();

  // Set organization ID in DI container (only if valid)
  if (orgId) {
    container.setOrgId(orgId);
  }

  // Get repository
  const alertRepo = container.getAlertRepository();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all alerts for user
   */
  const useAllAlerts = () => {
    return useQuery({
      queryKey: alertKeys.all(orgId, userId),
      queryFn: () => alertRepo.getByUser(userId),
    });
  };

  /**
   * Query: Get unread alerts
   */
  const useUnreadAlerts = () => {
    return useQuery({
      queryKey: alertKeys.unread(orgId),
      queryFn: () => alertRepo.getUnread(),
    });
  };

  /**
   * Query: Get high priority alerts
   */
  const useHighPriorityAlerts = () => {
    return useQuery({
      queryKey: ['alerts', orgId, 'high-priority'] as const,
      queryFn: () => alertRepo.getByPriority('HIGH'),
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create alert
   */
  const createAlert = useMutation({
    mutationFn: (data: Omit<Alert, 'id'>) => alertRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all(orgId, userId) });
    },
  });

  /**
   * Mutation: Mark as read
   */
  const markAsRead = useMutation({
    mutationFn: (alertId: string) => alertRepo.markAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all(orgId, userId) });
      queryClient.invalidateQueries({ queryKey: alertKeys.unread(orgId) });
    },
  });

  /**
   * Mutation: Mark multiple as read
   */
  const markMultipleAsRead = useMutation({
    mutationFn: (alertIds: string[]) => alertRepo.markMultipleAsRead(alertIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all(orgId, userId) });
      queryClient.invalidateQueries({ queryKey: alertKeys.unread(orgId) });
      toast.success('Alertas marcadas como leídas');
    },
  });

  /**
   * Mutation: Archive alert
   */
  const archiveAlert = useMutation({
    mutationFn: (alertId: string) => alertRepo.archive(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all(orgId, userId) });
    },
  });

  /**
   * Mutation: Delete alert
   */
  const deleteAlert = useMutation({
    mutationFn: (alertId: string) => alertRepo.delete(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all(orgId, userId) });
      toast.success('Alerta eliminada');
    },
  });

  return {
    // Queries
    useAllAlerts,
    useUnreadAlerts,
    useHighPriorityAlerts,

    // Mutations
    createAlert,
    markAsRead,
    markMultipleAsRead,
    archiveAlert,
    deleteAlert,
  };
}
