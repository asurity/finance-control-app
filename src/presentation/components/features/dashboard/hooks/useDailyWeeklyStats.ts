/**
 * useDailyWeeklyStats Hook
 * Provides daily and weekly expense statistics with React Query
 */

import { useQuery } from '@tantml:parameter>react-query';
import { format } from 'date-fns';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Hook for fetching daily and weekly statistics
 */
export function useDailyWeeklyStats(date: Date = new Date()) {
  const { currentOrgId } = useOrganization();
  const container = DIContainer.getInstance();
  const dateKey = format(date, 'yyyy-MM-dd'); // Cache key changes daily

  return useQuery({
    queryKey: ['daily-weekly-stats', currentOrgId, dateKey],
    queryFn: async () => {
      if (!currentOrgId) {
        throw new Error(`Organization not available. OrgId: ${currentOrgId}`);
      }

      try {
        container.setOrgId(currentOrgId);
        const useCase = container.getGetDailyWeeklyStatsUseCase();
        const result = await useCase.execute({
          orgId: currentOrgId,
          date,
        });
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!currentOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - fresher data for immediate spending tracking
    refetchOnWindowFocus: true,
  });
}
