/**
 * Hook: useAccountsSummary
 * Fetches all active accounts and calculates total balance
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export function useAccountsSummary() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['accounts-summary', currentOrgId, user?.id],
    queryFn: async () => {
      if (!user || !currentOrgId) throw new Error('User not authenticated');
      
      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);
      
      const accountRepo = container.getAccountRepository();
      const accounts = await accountRepo.getAll({ userId: user.id });
      
      const activeAccounts = accounts.filter(acc => acc.isActive);
      const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);

      return {
        accounts: activeAccounts,
        totalBalance,
      };
    },
    enabled: !!user && !!currentOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
