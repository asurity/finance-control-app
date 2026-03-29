/**
 * Hook: useExpensesByCategory
 * Fetches expenses grouped by category for pie chart
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export function useExpensesByCategory(period: 'month' | 'quarter' | 'year') {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['expenses-by-category', currentOrgId, period, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);
      
      const useCase = container.getGetExpensesByCategoryUseCase();
      return useCase.execute({ userId: user.id, period });
    },
    enabled: !!user && !!currentOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
