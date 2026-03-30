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
    public readonly bankName?: string,
    public readonly cardNumber?: string, // Últimos 4 dígitos
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

    // Card number validation - if present, should be 4 digits
    if (this.cardNumber !== undefined && this.cardNumber !== null && this.cardNumber.length > 0) {
      if (!/^\d{4}$/.test(this.cardNumber)) {
        throw new Error('Card number must be exactly 4 digits (last 4 digits only)');
      }
    }

    // Credit card/Line of credit specific validations - only validate if fields are present
    if (this.type === 'CREDIT_CARD' || this.type === 'LINE_OF_CREDIT') {
      // Credit limit is optional, but if present must be positive
      if (this.creditLimit !== undefined && this.creditLimit <= 0) {
        throw new Error('Credit limit must be positive when specified');
      }

      if (this.cutoffDay !== undefined && (this.cutoffDay < 1 || this.cutoffDay > 31)) {
        throw new Error('Cutoff day must be between 1 and 31');
      }

      if (this.paymentDueDay !== undefined && (this.paymentDueDay < 1 || this.paymentDueDay > 31)) {
        throw new Error('Payment due day must be between 1 and 31');
      }
    }

    // Balance validation for non-credit accounts
    if (this.type !== 'CREDIT_CARD' && this.type !== 'LINE_OF_CREDIT' && this.balance < 0) {
      throw new Error('Account balance cannot be negative for non-credit accounts');
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
      // Check if there's sufficient balance (except for credit accounts)
      if (this.type !== 'CREDIT_CARD' && this.type !== 'LINE_OF_CREDIT' && this.balance < amount) {
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

    // Credit accounts use credit limit, not balance
    if (this.type === 'CREDIT_CARD' || this.type === 'LINE_OF_CREDIT') {
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
   * Gets available credit (for credit cards and lines of credit)
   * @returns Available credit or undefined if not a credit account
   */
  getAvailableCredit(): number | undefined {
    if (this.type !== 'CREDIT_CARD' && this.type !== 'LINE_OF_CREDIT') {
      return undefined;
    }
    
    // If availableCredit is set, use it. Otherwise calculate from creditLimit - balance
    if (this.availableCredit !== undefined) {
      return this.availableCredit;
    }
    
    if (this.creditLimit !== undefined) {
      return Math.max(0, this.creditLimit - Math.abs(this.balance));
    }
    
    return undefined;
  }

  /**
   * Checks if credit account has available credit for a transaction
   * @param amount Transaction amount
   * @returns True if credit is available
   */
  hasAvailableCredit(amount: number): boolean {
    if (amount <= 0) {
      return false;
    }
    
    const availableCredit = this.getAvailableCredit();
    return availableCredit !== undefined && availableCredit >= amount;
  }

  /**
   * Gets credit utilization percentage (for credit cards and lines of credit)
   * @returns Utilization percentage or undefined if not a credit account
   */
  getCreditUtilization(): number | undefined {
    if ((this.type !== 'CREDIT_CARD' && this.type !== 'LINE_OF_CREDIT') || !this.creditLimit) {
      return undefined;
    }

    const used = Math.abs(this.balance);
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
