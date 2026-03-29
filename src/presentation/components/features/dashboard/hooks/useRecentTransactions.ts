/**
 * Hook: use Recent Transactions
 * Fetches the most recent transactions for the dashboard
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export function useRecentTransactions(limit: number = 5) {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['recent-transactions', currentOrgId, user?.id, limit],
    queryFn: async () => {
      if (!user || !currentOrgId) throw new Error('User not authenticated');
      
      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);
      
      const transactionRepo = container.getTransactionRepository();
      const accountRepo = container.getAccountRepository();
      const categoryRepo = container.getCategoryRepository();
      
      // Get all transactions for the user
      const transactions = await transactionRepo.getAll({ userId: user.id });
      
      // Sort by date descending
      const sortedTransactions = transactions.sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      ).slice(0, limit);

      // Enrich with account and category names
      const accounts = await accountRepo.getAll({ userId: user.id });
      const categories = await categoryRepo.getAll({ userId: user.id });
      
      const enriched = sortedTransactions.map(tx => {
        const account = accounts.find(acc => acc.id === tx.accountId);
        const category = categories.find(cat => cat.id === tx.categoryId);
        
        return {
          ...tx,
          accountName: account?.name,
          categoryName: category?.name,
        };
      });

      return enriched;
    },
    enabled: !!user && !!currentOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
