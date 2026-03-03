// useAlerts hook - React Query hooks for alert management
// Proactive notification system with user preferences

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertService, AlertSettingsService } from '@/lib/services/alert.service';
import { Alert, AlertType, AlertPriority } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useAlerts() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new AlertService(currentOrgId) : null;

  // Query: Get all alerts for user
  const {
    data: alerts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alerts', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getByUser(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Query: Get unread alerts
  const { data: unreadAlerts } = useQuery({
    queryKey: ['alerts-unread', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getUnread(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Query: Get urgent alerts
  const { data: urgentAlerts } = useQuery({
    queryKey: ['alerts-urgent', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return [];
      return service.getUrgent(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Mutation: Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => {
      if (!service) throw new Error('Organization not set');
      return service.markAsRead(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread', currentOrgId] });
    },
  });

  // Mutation: Mark multiple as read
  const markMultipleAsReadMutation = useMutation({
    mutationFn: (alertIds: string[]) => {
      if (!service) throw new Error('Organization not set');
      return service.markMultipleAsRead(alertIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread', currentOrgId] });
      toast.success('Alertas marcadas como leídas');
    },
  });

  // Mutation: Archive alert
  const archiveMutation = useMutation({
    mutationFn: (alertId: string) => {
      if (!service) throw new Error('Organization not set');
      return service.archive(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentOrgId] });
    },
  });

  return {
    alerts: alerts || [],
    unreadAlerts: unreadAlerts || [],
    urgentAlerts: urgentAlerts || [],
    unreadCount: unreadAlerts?.length || 0,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markMultipleAsRead: markMultipleAsReadMutation.mutate,
    archive: archiveMutation.mutate,
  };
}

// Hook for alerts by type
export function useAlertsByType(type: AlertType) {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alerts-by-type', currentOrgId, user?.id, type],
    queryFn: async () => {
      if (!currentOrgId || !user) return [];
      const service = new AlertService(currentOrgId);
      return service.getByType(user.id, type);
    },
    enabled: !!currentOrgId && !!user,
  });
}

// Hook for alert settings
export function useAlertSettings() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new AlertSettingsService(currentOrgId) : null;

  // Query: Get settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['alert-settings', currentOrgId, user?.id],
    queryFn: async () => {
      if (!service || !user) return null;
      return service.getUserSettings(user.id);
    },
    enabled: !!currentOrgId && !!user,
  });

  // Mutation: Update settings
  const updateMutation = useMutation({
    mutationFn: (data: Partial<NonNullable<typeof settings>>) => {
      if (!service || !user || !settings) throw new Error('User or organization not set');
      return service.updateSettings(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings', currentOrgId] });
      toast.success('Preferencias de alertas actualizadas');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar preferencias: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
