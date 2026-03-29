/**
 * Account Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { AccountType } from '@/types/firestore';

export class Account {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: AccountType,
    public balance: number, // Mutable - changes with transactions
    public readonly currency: string,
    public isActive: boolean, // Mutable - can be activated/deactivated
    public readonly creditCardId?: string,
    public readonly creditLimit?: number,
    public readonly availableCredit?: number,
    public readonly cutoffDay?: number,
    public readonly paymentDueDay?: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates account business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Account name is required');
    }

    if (this.name.length > 50) {
      throw new Error('Account name cannot exceed 50 characters');
    }

    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    // Credit card specific validations
    if (this.type === 'CREDIT_CARD') {
      if (this.creditLimit === undefined || this.creditLimit <= 0) {
        throw new Error('Credit card accounts must have a positive credit limit');
      }

      if (this.cutoffDay && (this.cutoffDay < 1 || this.cutoffDay > 31)) {
        throw new Error('Cutoff day must be between 1 and 31');
      }

      if (this.paymentDueDay && (this.paymentDueDay < 1 || this.paymentDueDay > 31)) {
        throw new Error('Payment due day must be between 1 and 31');
      }
    }

    // Balance validation for non-credit card accounts
    if (this.type !== 'CREDIT_CARD' && this.balance < 0) {
      throw new Error('Account balance cannot be negative for non-credit card accounts');
    }
  }

  /**
   * Updates account balance based on transaction
   * @param amount Transaction amount
   * @param isIncome Whether the transaction is income or expense
   * @throws Error if insufficient balance
   */
  updateBalance(amount: number, isIncome: boolean): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (isIncome) {
      this.balance += amount;
    } else {
      // Check if there's sufficient balance (except for credit cards)
      if (this.type !== 'CREDIT_CARD' && this.balance < amount) {
        throw new Error('Insufficient balance for this transaction');
      }
      this.balance -= amount;
    }
  }

  /**
   * Checks if account has available balance for a transaction
   * @param amount Transaction amount
   * @returns True if balance is sufficient
   */
  hasAvailableBalance(amount: number): boolean {
    if (amount <= 0) {
      return false;
    }

    // Credit cards use credit limit, not balance
    if (this.type === 'CREDIT_CARD') {
      return this.availableCredit !== undefined && this.availableCredit >= amount;
    }

    return this.balance >= amount;
  }

  /**
   * Checks if account is a credit card
   */
  isCreditCard(): boolean {
    return this.type === 'CREDIT_CARD';
  }

  /**
   * Checks if account is checking
   */
  isCheckingAccount(): boolean {
    return this.type === 'CHECKING';
  }

  /**
   * Checks if account is savings
   */
  isSavingsAccount(): boolean {
    return this.type === 'SAVINGS';
  }

  /**
   * Checks if account is cash
   */
  isCashAccount(): boolean {
    return this.type === 'CASH';
  }

  /**
   * Checks if account is investment
   */
  isInvestmentAccount(): boolean {
    return this.type === 'INVESTMENT';
  }

  /**
   * Activates the account
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Deactivates the account
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Gets available credit (for credit cards)
   * @returns Available credit or undefined if not a credit card
   */
  getAvailableCredit(): number | undefined {
    if (!this.isCreditCard()) {
      return undefined;
    }
    return this.availableCredit;
  }

  /**
   * Gets credit utilization percentage (for credit cards)
   * @returns Utilization percentage or undefined if not a credit card
   */
  getCreditUtilization(): number | undefined {
    if (!this.isCreditCard() || !this.creditLimit) {
      return undefined;
    }

    const used = this.creditLimit - (this.availableCredit || 0);
    return (used / this.creditLimit) * 100;
  }

  /**
   * Checks if credit card limit is approaching (>80% utilization)
   */
  isCreditLimitApproaching(): boolean {
    const utilization = this.getCreditUtilization();
    return utilization !== undefined && utilization > 80;
  }
}
