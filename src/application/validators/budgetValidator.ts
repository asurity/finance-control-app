/**
 * Budget Validators
 * Zod schemas for budget input validation
 */

import { z } from 'zod';

/**
 * Schema for creating a new budget
 */
export const CreateBudgetSchema = z
  .object({
    name: z.string().min(2).max(100),
    amount: z.number().positive().finite(),
    categoryId: z.string().min(1),
    startDate: z.date(),
    endDate: z.date(),
    userId: z.string().min(1),
    alertThreshold: z.number().min(0).max(100).default(80),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      const diffTime = Math.abs(data.endDate.getTime() - data.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 366;
    },
    {
      message: 'El período del presupuesto no puede exceder 1 año',
      path: ['endDate'],
    }
  );

/**
 * Schema for updating an existing budget
 */
export const UpdateBudgetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    amount: z.number().positive().finite().optional(),
    categoryId: z.string().min(1).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    alertThreshold: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      path: ['endDate'],
    }
  );

/**
 * Schema for checking budget status
 */
export const CheckBudgetStatusSchema = z.object({
  budgetId: z.string().min(1),
  asOfDate: z.date().default(() => new Date()),
});

/**
 * Schema for budget period filters
 */
export const BudgetPeriodSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
    includeInactive: z.boolean().default(false),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  });

/**
 * Schema for budget usage calculation
 */
export const BudgetUsageSchema = z.object({
  budgetId: z.string().min(1),
  includeProjected: z.boolean().default(false),
});

/**
 * Schema for deleting a budget
 */
export const DeleteBudgetSchema = z.object({
  budgetId: z.string().min(1),
});

// Type exports
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type CheckBudgetStatusInput = z.infer<typeof CheckBudgetStatusSchema>;
export type BudgetPeriodInput = z.infer<typeof BudgetPeriodSchema>;
export type BudgetUsageInput = z.infer<typeof BudgetUsageSchema>;
export type DeleteBudgetInput = z.infer<typeof DeleteBudgetSchema>;
