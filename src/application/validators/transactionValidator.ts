/**
 * Transaction Validators
 * Zod schemas for transaction input validation
 */

import { z } from 'zod';
import type { TransactionType } from '@/types/firestore';

/**
 * Schema for creating a new transaction
 */
export const CreateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .finite('El monto debe ser un número válido'),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres').max(200),
  date: z.date(),
  accountId: z.string().min(1, 'Debe seleccionar una cuenta'),
  categoryId: z.string().min(1, 'Debe seleccionar una categoría'),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
  tags: z.array(z.string().min(1)).default([]),
  receiptUrl: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  installments: z
    .number()
    .int('Las cuotas deben ser un número entero')
    .min(0, 'Las cuotas no pueden ser negativas')
    .max(60, 'Las cuotas no pueden exceder 60')
    .optional(),
  recurringTransactionId: z.string().optional(),
});

/**
 * Schema for updating an existing transaction
 */
export const UpdateTransactionSchema = z.object({
  id: z.string().min(1, 'El ID de transacción es requerido'),
  amount: z.number().positive('El monto debe ser mayor a 0').finite().optional(),
  description: z
    .string()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(200)
    .optional(),
  date: z.date().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  receiptUrl: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
});

/**
 * Schema for transaction search/filter parameters
 */
export const TransactionFilterSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema for date range queries
 */
export const DateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  });

/**
 * Schema for transaction statistics requests
 */
export const TransactionStatisticsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

// Type exports for use in application layer
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof TransactionFilterSchema>;
export type DateRangeInput = z.infer<typeof DateRangeSchema>;
export type TransactionStatisticsInput = z.infer<typeof TransactionStatisticsSchema>;
