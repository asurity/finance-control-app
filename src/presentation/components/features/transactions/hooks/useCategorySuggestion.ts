/**
 * useCategorySuggestion Hook
 * Provides smart category suggestions based on transaction description
 * Uses debounced pattern matching against user's transaction history
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import type { TransactionType } from '@/types/firestore';

interface CategorySuggestion {
  categoryId: string | null;
  confidence: 'high' | 'medium' | 'low';
  categoryName?: string;
}

interface UseCategorySuggestionProps {
  orgId: string;
  userId: string;
  transactionType: TransactionType;
  description: string;
  categories: Array<{ id: string; name: string }>;
  enabled?: boolean;
}

export function useCategorySuggestion({
  orgId,
  userId,
  transactionType,
  description,
  categories,
  enabled = true,
}: UseCategorySuggestionProps): CategorySuggestion & { isLoading: boolean } {
  const [suggestion, setSuggestion] = useState<CategorySuggestion>({
    categoryId: null,
    confidence: 'low',
  });
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSuggestion = useCallback(
    async (desc: string) => {
      if (!desc || desc.length < 2 || !orgId || !enabled) {
        setSuggestion({ categoryId: null, confidence: 'low' });
        return;
      }

      setIsLoading(true);
      try {
        const container = DIContainer.getInstance();
        container.setOrgId(orgId);
        const useCase = container.getSuggestCategoryUseCase();
        const result = await useCase.execute({
          description: desc,
          type: transactionType,
          userId,
        });

        const categoryName = result.suggestedCategoryId
          ? categories.find((c) => c.id === result.suggestedCategoryId)?.name
          : undefined;

        setSuggestion({
          categoryId: result.suggestedCategoryId,
          confidence: result.confidence,
          categoryName,
        });
      } catch {
        setSuggestion({ categoryId: null, confidence: 'low' });
      } finally {
        setIsLoading(false);
      }
    },
    [orgId, userId, transactionType, categories, enabled]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestion(description);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [description, fetchSuggestion]);

  return { ...suggestion, isLoading };
}
