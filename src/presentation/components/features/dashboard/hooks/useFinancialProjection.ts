/**
 * useFinancialProjection Hook
 * Provides financial projection with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Hook for fetching financial projection
 * Answers: "Will my money last until the end of the month?"
 */
export function useFinancialProjection(referenceDate: Date = new Date()) {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const container = DIContainer.getInstance();

  return useQuery({
    queryKey: ['financial-projection', currentOrgId, user?.id],
    queryFn: async () => {
      if (!currentOrgId || !user) {
        throw new Error(
          `Organization or user not available. OrgId: ${currentOrgId}, UserId: ${user?.id}`
        );
      }

      try {
        container.setOrgId(currentOrgId);
        const useCase = container.getCalculateFinancialProjectionUseCase();
        const result = await useCase.execute({
          userId: user.id,
          organizationId: currentOrgId,
          referenceDate,
        });
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!currentOrgId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - projection doesn't change that frequently
    refetchOnWindowFocus: true,
  });
}
