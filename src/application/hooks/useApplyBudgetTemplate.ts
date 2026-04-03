/**
 * Hook: useApplyBudgetTemplate
 * 
 * Applies a budget template to a budget period by creating categories
 * and setting their allocation percentages.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { BudgetTemplate } from '@/lib/constants/budgetTemplates';
import { useCategoryBudgets } from './useCategoryBudgets';
import { useCategories } from './useCategories';

interface UseApplyBudgetTemplateProps {
  organizationId: string;
  budgetPeriodId: string;
  totalIncome: number;
}

export function useApplyBudgetTemplate({
  organizationId,
  budgetPeriodId,
  totalIncome,
}: UseApplyBudgetTemplateProps) {
  const [isApplying, setIsApplying] = useState(false);
  
  // Get hooks
  const categoryBudgetsHook = useCategoryBudgets(organizationId);
  const categoriesHook = useCategories(organizationId);
  
  // Get categories and category budgets data
  const { data: categories = [] } = categoriesHook.useAllCategories();
  const { data: categoryBudgetsData, refetch: refetchCategoryBudgets } = 
    categoryBudgetsHook.useCategoryBudgetsByPeriod(budgetPeriodId);
  const categoryBudgets = categoryBudgetsData?.categoryBudgets || [];

  const applyTemplate = async (template: BudgetTemplate) => {
    if (!totalIncome || totalIncome <= 0) {
      toast.error('Debes establecer un ingreso total antes de aplicar una plantilla.');
      return;
    }

    setIsApplying(true);
    try {
      // Track template application statistics
      let categoriesUpdated = 0;
      let errors: string[] = [];

      // Process each category in the template
      for (const templateCategory of template.categories) {
        try {
          // Find existing category by name (case-insensitive)
          const existingCategory = categories.find(
            (cat) => cat.name.toLowerCase() === templateCategory.name.toLowerCase()
          );

          if (existingCategory) {
            // Category exists - check if budget allocation already exists
            const existingBudget = categoryBudgets.find(
              (cb) => cb.categoryId === existingCategory.id
            );

            // Only create/update if there's no existing allocation or if percentage is 0
            if (!existingBudget || existingBudget.percentage === 0) {
              await categoryBudgetsHook.setCategoryBudget.mutateAsync({
                budgetPeriodId,
                categoryId: existingCategory.id,
                percentage: templateCategory.percentage,
                userId: organizationId, // Using organizationId as userId for shared budgets
                organizationId,
              });
              categoriesUpdated++;
            }
          } else {
            // Category doesn't exist - skip it
            errors.push(`Categoría "${templateCategory.name}" no encontrada`);
          }
        } catch (error) {
          console.error(`Error applying template for category ${templateCategory.name}:`, error);
          errors.push(`Error en "${templateCategory.name}"`);
        }
      }

      // Refetch to get updated data
      await refetchCategoryBudgets();

      // Show success/warning message
      if (errors.length === 0) {
        toast.success('Plantilla aplicada', {
          description: `Se aplicaron los porcentajes a ${categoriesUpdated} categorías.`,
        });
      } else if (categoriesUpdated > 0) {
        toast.success('Plantilla aplicada parcialmente', {
          description: `${categoriesUpdated} categorías actualizadas. ${errors.length} categorías no encontradas.`,
        });
      } else {
        toast.error('No se aplicó la plantilla', {
          description: 'Ninguna categoría de la plantilla coincide con tus categorías existentes.',
        });
      }
    } catch (error) {
      console.error('Error applying budget template:', error);
      toast.error('Error al aplicar la plantilla', {
        description: 'Por favor intenta de nuevo.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return {
    applyTemplate,
    isApplying,
  };
}
