/**
 * useDashboardStats Hook
 * Provides dashboard statistics with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export type DashboardPeriod = 'month' | 'quarter' | 'year';

/**
 * Hook for fetching dashboard statistics
 */
export function useDashboardStats(period: DashboardPeriod = 'month') {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const container = DIContainer.getInstance();

  return useQuery({
    queryKey: ['dashboard-stats', currentOrgId, period, user?.id],
    queryFn: async () => {
      if (!currentOrgId || !user) {
        throw new Error(`Organization or user not available. OrgId: ${currentOrgId}, UserId: ${user?.id}`);
      }

      try {
        container.setOrgId(currentOrgId);
        const useCase = container.getGetDashboardStatisticsUseCase();
        const result = await useCase.execute({
          userId: user.id,
          period,
        });
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!currentOrgId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
