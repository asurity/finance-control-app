/**
 * Credit Card Validators
 * Zod schemas for credit card input validation (simplified for Zod 4.x)
 */

import { z } from 'zod';

/**
 * Schema for creating a new credit card
 */
export const CreateCreditCardSchema = z.object({
  accountId: z.string().min(1),
  cardNumber: z.string().regex(/^\d{4}$/),
  cardHolderName: z.string().min(3).max(100),
  bankName: z.string().min(2).max(50),
  creditLimit: z.number().positive().finite(),
 availableCredit: z.number().nonnegative().finite(),
  cutoffDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  userId: z.string().min(1),
  isActive: z.boolean().default(true),
})
  .refine((data) => data.availableCredit <= data.creditLimit, {
    message: 'El crédito disponible no puede exceder el límite de créd ito',
    path: ['availableCredit'],
  })
  .refine((data) => data.cutoffDay !== data.paymentDueDay, {
    message: 'El día de corte y el día de pago deben ser diferentes',
    path: ['paymentDueDay'],
  });

/**
 * Schema for updating an existing credit card
 */
export const UpdateCreditCardSchema = z.object({
  id: z.string().min(1),
  cardNumber: z.string().regex(/^\d{4}$/).optional(),
  cardHolderName: z.string().min(3).max(100).optional(),
  bankName: z.string().min(2).max(50).optional(),
  creditLimit: z.number().positive().finite().optional(),
  cutoffDay: z.number().int().min(1).max(31).optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.cutoffDay !== undefined && data.paymentDueDay !== undefined) {
      return data.cutoffDay !== data.paymentDueDay;
    }
    return true;
  },
  {
    message: 'El día de corte y el día de pago deben ser diferentes',
    path: ['paymentDueDay'],
  }
);

/**
 * Schema for credit card payment
 */
export const CreditCardPaymentSchema = z.object({
  creditCardId: z.string().min(1),
  paymentAccountId: z.string().min(1),
  amount: z.number().positive().finite(),
  paymentDate: z.date().default(() => new Date()),
  description: z.string().max(200).optional().default('Pago de tarjeta de crédito'),
}).refine(
  (data) => data.creditCardId !== data.paymentAccountId,
  {
    message: 'La tarjeta y la cuenta de pago deben ser diferentes',
    path: ['paymentAccountId'],
  }
);

/**
 * Schema for calculating card balance
 */
export const CalculateCardBalanceSchema = z.object({
  creditCardId: z.string().min(1),
  asOfDate: z.date().default(() => new Date()),
  includePending: z.boolean().default(true),
});

/**
 * Schema for getting upcoming payments
 */
export const GetUpcomingPaymentsSchema = z.object({
  creditCardId: z.string().min(1).optional(),
  daysAhead: z.number().int().min(1).max(90).default(30),
  includeOverdue: z.boolean().default(true),
});

/**
 * Schema for credit card statement period
 */
export const StatementPeriodSchema = z.object({
  creditCardId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

/**
 * Schema for deleting a credit card
 */
export const DeleteCreditCardSchema = z.object({
  creditCardId: z.string().min(1),
  force: z.boolean().default(false),
});

// Type exports
export type CreateCreditCardInput = z.infer<typeof CreateCreditCardSchema>;
export type UpdateCreditCardInput = z.infer<typeof UpdateCreditCardSchema>;
export type CreditCardPaymentInput = z.infer<typeof CreditCardPaymentSchema>;
export type CalculateCardBalanceInput = z.infer<typeof CalculateCardBalanceSchema>;
export type GetUpcomingPaymentsInput = z.infer<typeof GetUpcomingPaymentsSchema>;
export type StatementPeriodInput = z.infer<typeof StatementPeriodSchema>;
export type DeleteCreditCardInput = z.infer<typeof DeleteCreditCardSchema>;
