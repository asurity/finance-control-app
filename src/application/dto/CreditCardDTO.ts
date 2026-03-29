/**
 * Credit Card DTOs
 * Data Transfer Objects for Credit Card operations
 */

/**
 * DTO for creating a new credit card
 */
export interface CreateCreditCardDTO {
  accountId: string;
  cardNumber: string;
  cardHolderName: string;
  bankName: string;
  creditLimit: number;
  availableCredit: number;
  cutoffDay: number;
  paymentDueDay: number;
  userId: string;
  isActive?: boolean;
}

/**
 * DTO for updating a credit card
 */
export interface UpdateCreditCardDTO {
  id: string;
  cardNumber?: string;
  cardHolderName?: string;
  bankName?: string;
  creditLimit?: number;
  cutoffDay?: number;
  paymentDueDay?: number;
  isActive?: boolean;
}

/**
 * DTO for deleting a credit card
 */
export interface DeleteCreditCardDTO {
  creditCardId: string;
  force?: boolean;
}

/**
 * DTO for credit card payment
 */
export interface CreditCardPaymentDTO {
  creditCardId: string;
  paymentAccountId: string;
  amount: number;
  paymentDate?: Date;
  description?: string;
}

/**
 * DTO for calculating credit card balance
 */
export interface CalculateCreditCardBalanceDTO {
  creditCardId: string;
  asOfDate?: Date;
  includePending?: boolean;
}

/**
 * DTO for getting upcoming payments
 */
export interface GetUpcomingPaymentsDTO {
  creditCardId?: string;
  daysAhead?: number;
  includeOverdue?: boolean;
}

/**
 * DTO for credit card statement period
 */
export interface CreditCardStatementPeriodDTO {
  creditCardId: string;
  year: number;
  month: number;
}
