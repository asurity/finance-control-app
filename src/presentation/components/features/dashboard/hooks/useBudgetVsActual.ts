/**
 * useBudgetVsActual Hook
 * Obtiene datos comparativos de presupuesto asignado vs gasto real por categoría
 */

import { useMemo } from 'react';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { useCategoryBudgets } from '@/application/hooks/useCategoryBudgets';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useCategories } from '@/application/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

interface BudgetVsActualData {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  color: string;
  status: 'under' | 'at-limit' | 'over';
}

export function useBudgetVsActual(orgId: string) {
  const { user } = useAuth();
  const { useCurrentBudgetPeriod } = useBudgetPeriods(orgId);
  const { useCategoryBudgetsByPeriod } = useCategoryBudgets(orgId);
  const { useTransactionsByDateRange } = useTransactions(orgId);
  const categoriesHook = useCategories(orgId);

  // Obtener período activo
  const { data: activePeriodData, isLoading: periodLoading } = useCurrentBudgetPeriod(
    user?.id || ''
  );

  const activePeriod = activePeriodData?.budgetPeriod ?? null;

  // Obtener categorías
  const { data: allCategories = [], isLoading: categoriesLoading } =
    categoriesHook.useAllCategories();

  // Obtener presupuestos por categoría del período activo
  const { data: categoryBudgetsData, isLoading: budgetsLoading } = useCategoryBudgetsByPeriod(
    activePeriod?.id || ''
  );

  const categoryBudgets = useMemo(
    () => categoryBudgetsData?.categoryBudgets ?? [],
    [categoryBudgetsData]
  );

  // Obtener transacciones del período
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactionsByDateRange(
    activePeriod?.startDate || new Date(),
    activePeriod?.endDate || new Date()
  );

  const data = useMemo<BudgetVsActualData[]>(() => {
    if (!activePeriod || categoryBudgets.length === 0) {
      return [];
    }

    // Calcular gastos reales por categoría
    const spentByCategory = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((transaction) => {
        const current = spentByCategory.get(transaction.categoryId) || 0;
        spentByCategory.set(transaction.categoryId, current + transaction.amount);
      });

    // Construir datos comparativos
    return categoryBudgets
      .map((budget: CategoryBudget) => {
        const category = allCategories.find((c) => c.id === budget.categoryId);
        if (!category) return null;

        const spent = spentByCategory.get(budget.categoryId) || 0;
        const remaining = budget.allocatedAmount - spent;
        const percentUsed = budget.allocatedAmount > 0 ? (spent / budget.allocatedAmount) * 100 : 0;

        let status: 'under' | 'at-limit' | 'over';
        if (percentUsed < 90) {
          status = 'under';
        } else if (percentUsed >= 90 && percentUsed <= 100) {
          status = 'at-limit';
        } else {
          status = 'over';
        }

        return {
          categoryId: budget.categoryId,
          categoryName: category.name,
          budgeted: budget.allocatedAmount,
          spent,
          remaining,
          percentUsed,
          color: category.color,
          status,
        };
      })
      .filter((item: BudgetVsActualData | null): item is BudgetVsActualData => item !== null)
      .sort((a: BudgetVsActualData, b: BudgetVsActualData) => b.budgeted - a.budgeted);
  }, [activePeriod, categoryBudgets, transactions, allCategories]);

  return {
    data,
    activePeriod,
    isLoading: periodLoading || budgetsLoading || transactionsLoading || categoriesLoading,
    hasActivePeriod: !!activePeriod,
  };
}
