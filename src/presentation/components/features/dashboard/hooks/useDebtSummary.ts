/**
 * useDebtSummary Hook
 * Provides debt summary statistics with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Hook for fetching debt summary and net worth
 */
export function useDebtSummary() {
  const { currentOrgId } = useOrganization();
  const container = DIContainer.getInstance();

  return useQuery({
    queryKey: ['debt-summary', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) {
        throw new Error(`Organization not available. OrgId: ${currentOrgId}`);
      }

      try {
        container.setOrgId(currentOrgId);
        const useCase = container.getGetDebtSummaryUseCase();
        const result = await useCase.execute({
          orgId: currentOrgId,
        });
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!currentOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
