/**
 * useSmartDefaults Hook
 * Proporciona valores predeterminados inteligentes para formularios de transacciones
 * basados en el comportamiento histórico del usuario
 */

import { useMemo } from 'react';
import { startOfMonth, subMonths } from 'date-fns';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import type { TransactionType } from '@/types/firestore';

interface SmartDefaults {
  defaultAccountId: string | null;
  suggestedCategoryId: string | null;
  defaultDate: Date;
  recentCategories: Array<{ 
    id: string; 
    name: string; 
    count: number;
    color: string;
  }>;
  mostUsedAccount: string | null;
  isLoading: boolean;
}

interface UseSmartDefaultsProps {
  orgId: string;
  userId: string;
  transactionType: TransactionType;
}

/**
 * Hook que proporciona defaults inteligentes para formularios de transacciones
 */
export function useSmartDefaults({ 
  orgId, 
  userId, 
  transactionType 
}: UseSmartDefaultsProps): SmartDefaults {
  // Obtener transacciones del último mes
  const { useTransactionsByDateRange } = useTransactions(orgId);
  const { useActiveAccounts } = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);
  
  const startDate = startOfMonth(subMonths(new Date(), 1));
  const endDate = new Date();

  const { 
    data: recentTransactions = [], 
    isLoading: loadingTransactions 
  } = useTransactionsByDateRange(startDate, endDate);

  const { 
    data: accounts = [], 
    isLoading: loadingAccounts 
  } = useActiveAccounts();

  const { 
    data: allCategories = [], 
    isLoading: loadingCategories 
  } = categoriesHook.useAllCategories();

  // Obtener última cuenta usada del localStorage
  const lastAccountIdFromStorage = typeof window !== 'undefined' 
    ? localStorage.getItem(`lastAccountId_${orgId}`) 
    : null;

  const smartDefaults = useMemo<SmartDefaults>(() => {
    const isLoading = loadingTransactions || loadingAccounts || loadingCategories;

    // Fecha por defecto: siempre hoy
    const defaultDate = new Date();

    // Filtrar transacciones por tipo
    const transactionsByType = recentTransactions.filter(
      t => t.type === transactionType
    );

    // Calcular cuenta más usada en el último mes para este tipo de transacción
    const accountFrequency = new Map<string, number>();
    transactionsByType.forEach(transaction => {
      const count = accountFrequency.get(transaction.accountId) || 0;
      accountFrequency.set(transaction.accountId, count + 1);
    });

    let mostUsedAccount: string | null = null;
    let maxCount = 0;
    accountFrequency.forEach((count, accountId) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedAccount = accountId;
      }
    });

    // Determinar cuenta por defecto: localStorage > más usada > primera disponible
    let defaultAccountId: string | null = null;
    if (lastAccountIdFromStorage && accounts.some(a => a.id === lastAccountIdFromStorage)) {
      defaultAccountId = lastAccountIdFromStorage;
    } else if (mostUsedAccount) {
      defaultAccountId = mostUsedAccount;
    } else if (accounts.length > 0) {
      // Preferir cuenta de débito sobre crédito para gastos
      const preferredAccount = transactionType === 'EXPENSE'
        ? accounts.find(a => a.type === 'CHECKING') || accounts[0]
        : accounts[0];
      defaultAccountId = preferredAccount.id;
    }

    // Calcular categorías más usadas
    const categoryFrequency = new Map<string, number>();
    transactionsByType.forEach(transaction => {
      const count = categoryFrequency.get(transaction.categoryId) || 0;
      categoryFrequency.set(transaction.categoryId, count + 1);
    });

    // Convertir a array y ordenar por frecuencia
    const categoriesWithCount = Array.from(categoryFrequency.entries())
      .map(([categoryId, count]) => {
        const category = allCategories.find(c => c.id === categoryId);
        return {
          id: categoryId,
          name: category?.name || 'Sin categoría',
          count,
          color: category?.color || '#gray',
        };
      })
      .filter(c => c.name !== 'Sin categoría') // Filtrar categorías eliminadas
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 categorías más usadas

    // Categoría sugerida: la más frecuente
    const suggestedCategoryId = categoriesWithCount[0]?.id || null;

    return {
      defaultAccountId,
      suggestedCategoryId,
      defaultDate,
      recentCategories: categoriesWithCount,
      mostUsedAccount,
      isLoading,
    };
  }, [
    recentTransactions,
    accounts,
    allCategories,
    transactionType,
    lastAccountIdFromStorage,
    loadingTransactions,
    loadingAccounts,
    loadingCategories,
    orgId,
  ]);

  return smartDefaults;
}
