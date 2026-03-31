/**
 * Transaction Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { TransactionType } from '@/types/firestore';

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly description: string,
    public readonly date: Date,
    public readonly accountId: string,
    public readonly categoryId: string,
    public readonly userId: string,
    public readonly tags?: string[],
    public readonly receiptUrl?: string,
    public readonly isInstallment?: boolean,
    public readonly installmentNumber?: number,
    public readonly totalInstallments?: number,
    public readonly installmentGroupId?: string,
    public readonly isRecurring?: boolean,
    public readonly recurringTransactionId?: string,
    public readonly creditCardId?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates transaction business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (this.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Transaction description is required');
    }

    if (this.description.length > 200) {
      throw new Error('Description cannot exceed 200 characters');
    }

    if (!this.accountId || this.accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    if (!this.categoryId || this.categoryId.trim().length === 0) {
      throw new Error('Category ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Installment validation
    if (this.isInstallment) {
      if (!this.totalInstallments || this.totalInstallments < 2) {
        throw new Error('Installment transactions must have at least 2 installments');
      }

      if (!this.installmentNumber || this.installmentNumber < 1) {
        throw new Error('Installment number must be at least 1');
      }

      if (this.installmentNumber > this.totalInstallments) {
        throw new Error('Installment number cannot exceed total installments');
      }

      if (!this.installmentGroupId) {
        throw new Error('Installment group ID is required for installment transactions');
      }
    }

    // Date validation
    if (!(this.date instanceof Date) || isNaN(this.date.getTime())) {
      throw new Error('Invalid transaction date');
    }
  }

  /**
   * Checks if transaction is an expense
   */
  isExpense(): boolean {
    return this.type === 'EXPENSE';
  }

  /**
   * Checks if transaction is an income
   */
  isIncome(): boolean {
    return this.type === 'INCOME';
  }

  /**
   * Checks if transaction has installments
   */
  hasInstallments(): boolean {
    return this.isInstallment === true;
  }

  /**
   * Checks if transaction is a recurring transaction
   */
  isRecurringTransaction(): boolean {
    return this.isRecurring === true;
  }

  /**
   * Checks if transaction can be edited
   * Installment transactions can only be edited from the first installment
   */
  canBeEdited(): boolean {
    if (!this.isInstallment) {
      return true;
    }
    return this.installmentNumber === 1;
  }

  /**
   * Checks if transaction can be deleted
   */
  canBeDeleted(): boolean {
    // Recurring transactions should be managed through the recurring transaction entity
    if (this.isRecurring) {
      return false;
    }
    return true;
  }

  /**
   * Checks if this is the first installment
   */
  isFirstInstallment(): boolean {
    return this.isInstallment === true && this.installmentNumber === 1;
  }

  /**
   * Checks if this is the last installment
   */
  isLastInstallment(): boolean {
    return this.isInstallment === true && this.installmentNumber === this.totalInstallments;
  }

  /**
   * Gets the installment progress as a percentage
   */
  getInstallmentProgress(): number {
    if (!this.isInstallment || !this.installmentNumber || !this.totalInstallments) {
      return 0;
    }
    return (this.installmentNumber / this.totalInstallments) * 100;
  }

  /**
   * Checks if transaction has a receipt
   */
  hasReceipt(): boolean {
    return !!this.receiptUrl && this.receiptUrl.trim().length > 0;
  }

  /**
   * Checks if transaction has tags
   */
  hasTags(): boolean {
    return !!this.tags && this.tags.length > 0;
  }

  /**
   * Checks if transaction is paid with credit card
   */
  isPaidWithCreditCard(): boolean {
    return !!this.creditCardId && this.creditCardId.trim().length > 0;
  }
}
