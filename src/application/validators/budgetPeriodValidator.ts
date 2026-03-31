/**
 * Budget Period Validators
 * Zod schemas for budget period input validation
 */

import { z } from 'zod';

/**
 * Schema for creating a new budget period
 */
export const CreateBudgetPeriodSchema = z
  .object({
    totalAmount: z
      .number()
      .positive('El monto total debe ser mayor a 0')
      .finite('El monto debe ser un número válido'),
    startDate: z.date(),
    endDate: z.date(),
    userId: z.string().min(1, 'El ID de usuario es requerido'),
    organizationId: z.string().min(1).nullable().optional(),
    name: z.string().max(100, 'El nombre no puede exceder 100 caracteres').optional(),
    description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  });

/**
 * Schema for updating an existing budget period
 */
export const UpdateBudgetPeriodSchema = z
  .object({
    id: z.string().min(1, 'El ID del período presupuestario es requerido'),
    totalAmount: z.number().positive('El monto total debe ser mayor a 0').finite().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    name: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // If both dates are provided, validate them
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
 * Schema for deleting a budget period
 */
export const DeleteBudgetPeriodSchema = z.object({
  id: z.string().min(1, 'El ID del período presupuestario es requerido'),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
});

/**
 * Schema for getting a budget period
 */
export const GetBudgetPeriodSchema = z.object({
  id: z.string().min(1, 'El ID del período presupuestario es requerido'),
});

/**
 * Schema for listing budget periods
 */
export const ListBudgetPeriodsSchema = z.object({
  userId: z.string().min(1, 'El ID de usuario es requerido'),
  organizationId: z.string().min(1).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  activeOnly: z.boolean().optional().default(false),
});

/**
 * Schema for getting current budget period
 */
export const GetCurrentBudgetPeriodSchema = z.object({
  userId: z.string().min(1, 'El ID de usuario es requerido'),
  date: z.date().optional(),
});

/**
 * Schema for budget period date range validation
 */
export const BudgetPeriodDateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      // Validate that the period is not too long (e.g., max 1 year)
      const maxDays = 365;
      const diffTime = Math.abs(data.endDate.getTime() - data.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    },
    {
      message: 'El período presupuestario no puede exceder 365 días',
      path: ['endDate'],
    }
  );

// Export type inference
export type CreateBudgetPeriodInput = z.infer<typeof CreateBudgetPeriodSchema>;
export type UpdateBudgetPeriodInput = z.infer<typeof UpdateBudgetPeriodSchema>;
export type DeleteBudgetPeriodInput = z.infer<typeof DeleteBudgetPeriodSchema>;
export type GetBudgetPeriodInput = z.infer<typeof GetBudgetPeriodSchema>;
export type ListBudgetPeriodsInput = z.infer<typeof ListBudgetPeriodsSchema>;
export type GetCurrentBudgetPeriodInput = z.infer<typeof GetCurrentBudgetPeriodSchema>;
