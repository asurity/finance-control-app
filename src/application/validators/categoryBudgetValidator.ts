/**
 * Category Budget Validators
 * Zod schemas for category budget input validation
 */

import { z } from 'zod';

/**
 * Schema for setting a new category budget
 */
export const SetCategoryBudgetSchema = z.object({
  budgetPeriodId: z.string().min(1, 'El ID del período presupuestario es requerido'),
  categoryId: z.string().min(1, 'El ID de categoría es requerido'),
  percentage: z
    .number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede exceder 100')
    .finite('El porcentaje debe ser un número válido'),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
  organizationId: z.string().min(1).nullable().optional(),
});

/**
 * Schema for updating a category budget percentage
 */
export const UpdateCategoryBudgetPercentageSchema = z.object({
  id: z.string().min(1, 'El ID del presupuesto de categoría es requerido'),
  percentage: z
    .number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede exceder 100')
    .finite(),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
});

/**
 * Schema for deleting a category budget
 */
export const DeleteCategoryBudgetSchema = z.object({
  id: z.string().min(1, 'El ID del presupuesto de categoría es requerido'),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
});

/**
 * Schema for getting category budget status
 */
export const GetCategoryBudgetStatusSchema = z.object({
  id: z.string().min(1, 'El ID del presupuesto de categoría es requerido'),
});

/**
 * Schema for getting budget period summary
 */
export const GetBudgetPeriodSummarySchema = z.object({
  budgetPeriodId: z.string().min(1, 'El ID del período presupuestario es requerido'),
});

/**
 * Schema for listing category budgets
 */
export const ListCategoryBudgetsSchema = z
  .object({
    budgetPeriodId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
  })
  .refine((data) => data.budgetPeriodId || data.categoryId || data.userId, {
    message: 'Se requiere al menos un parámetro de filtro (budgetPeriodId, categoryId, o userId)',
  });

/**
 * Schema for batch category budget creation
 */
export const BatchSetCategoryBudgetsSchema = z
  .object({
    budgetPeriodId: z.string().min(1, 'El ID del período presupuestario es requerido'),
    userId: z.string().min(1, 'El ID de usuario es requerido'),
    organizationId: z.string().min(1).nullable().optional(),
    categories: z.array(
      z.object({
        categoryId: z.string().min(1, 'El ID de categoría es requerido'),
        percentage: z
          .number()
          .min(0, 'El porcentaje no puede ser negativo')
          .max(100, 'El porcentaje no puede exceder 100')
          .finite(),
      })
    ),
  })
  .refine(
    (data) => {
      // Validate that total percentage does not exceed 100%
      const totalPercentage = data.categories.reduce((sum, cat) => sum + cat.percentage, 0);
      return totalPercentage <= 100;
    },
    {
      message: 'La suma de los porcentajes no puede exceder 100%',
      path: ['categories'],
    }
  );

/**
 * Schema for updating spent amount
 */
export const UpdateSpentAmountSchema = z.object({
  id: z.string().min(1, 'El ID del presupuesto de categoría es requerido'),
  spentAmount: z
    .number()
    .min(0, 'El monto gastado no puede ser negativo')
    .finite('El monto debe ser un número válido'),
});

// Export type inference
export type SetCategoryBudgetInput = z.infer<typeof SetCategoryBudgetSchema>;
export type UpdateCategoryBudgetPercentageInput = z.infer<
  typeof UpdateCategoryBudgetPercentageSchema
>;
export type DeleteCategoryBudgetInput = z.infer<typeof DeleteCategoryBudgetSchema>;
export type GetCategoryBudgetStatusInput = z.infer<typeof GetCategoryBudgetStatusSchema>;
export type GetBudgetPeriodSummaryInput = z.infer<typeof GetBudgetPeriodSummarySchema>;
export type ListCategoryBudgetsInput = z.infer<typeof ListCategoryBudgetsSchema>;
export type BatchSetCategoryBudgetsInput = z.infer<typeof BatchSetCategoryBudgetsSchema>;
export type UpdateSpentAmountInput = z.infer<typeof UpdateSpentAmountSchema>;
