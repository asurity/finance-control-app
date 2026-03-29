/**
 * Hook: useUnreadAlerts
 * Fetches unread alerts for the current user
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export function useUnreadAlerts(limit: number = 3) {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['unread-alerts', currentOrgId, user?.id, limit],
    queryFn: async () => {
      if (!user || !currentOrgId) throw new Error('User not authenticated');
      
      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);
      
      const alertRepo = container.getAlertRepository();
      const allAlerts = await alertRepo.getAll({ userId: user.id });
      
      // Filter unread and sort by date descending
      const unreadAlerts = allAlerts
        .filter(alert => !alert.isRead)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      return unreadAlerts;
    },
    enabled: !!user && !!currentOrgId,
    staleTime: 1 * 60 * 1000, // 1 minute (alerts are time-sensitive)
  });
}
