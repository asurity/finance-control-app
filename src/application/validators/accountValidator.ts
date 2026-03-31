/**
 * Account Validators
 * Zod schemas for account input validation
 */

import { z } from 'zod';
import type { AccountType } from '@/types/firestore';

/**
 * Schema for creating a new account
 */
export const CreateAccountSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LINE_OF_CREDIT']),
  balance: z.number().finite('El balance debe ser un número válido'),
  currency: z.string().length(3, 'La moneda debe ser un código de 3 letras (ej: CLP, USD)').default('CLP'),
  userId: z.string().min(1, 'El ID de usuario es requerido'),
  description: z.string().max(200).optional(),
  // Bank information
  bankName: z.string().min(2).max(100).optional(),
  cardNumber: z.string().regex(/^\d{4}$/, 'Últimos 4 dígitos de la tarjeta (ejemplo: 1234)').optional(),
  // Credit card/line of credit fields
  creditLimit: z.number().positive().finite().optional(),
  creditCardCutoffDay: z.number().int().min(1).max(31).optional(),
  creditCardPaymentDays: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.type === 'CREDIT_CARD' || data.type === 'LINE_OF_CREDIT') {
      return (
        data.creditLimit !== undefined &&
        data.creditCardCutoffDay !== undefined &&
        data.creditCardPaymentDays !== undefined
      );
    }
    return true;
  },
  {
    message: 'Las tarjetas de crédito y líneas de crédito requieren límite, día de corte y días de pago',
    path: ['creditLimit'],
  }
);

/**
 * Schema for updating an existing account
 */
export const UpdateAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(50).optional(),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LINE_OF_CREDIT']).optional(),
  balance: z.number().finite('El balance debe ser un número válido').optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(200).optional(),
  bankName: z.string().min(2).max(100).optional(),
  cardNumber: z.string().regex(/^\d{4}$/).optional(),
  creditLimit: z.number().positive().finite().optional(),
  creditCardCutoffDay: z.number().int().min(1).max(31).optional(),
  creditCardPaymentDays: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for manual balance update (administrative action)
 */
export const UpdateBalanceSchema = z.object({
  accountId: z.string().min(1),
  newBalance: z.number().finite(),
  reason: z.string().min(10).max(200),
});

/**
 * Schema for transfer between accounts
 */
export const TransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive().finite(),
  description: z.string().min(3).max(200).optional().default('Transferencia entre cuentas'),
  date: z.date().default(() => new Date()),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  {
    message: 'Las cuentas de origen y destino deben ser diferentes',
    path: ['toAccountId'],
  }
);

/**
 * Schema for deleting an account
 */
export const DeleteAccountSchema = z.object({
  accountId: z.string().min(1),
  force: z.boolean().default(false),
});

// Type exports
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type UpdateBalanceInput = z.infer<typeof UpdateBalanceSchema>;
export type TransferInput = z.infer<typeof TransferSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
