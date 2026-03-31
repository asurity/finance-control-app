/**
 * CreditCard Domain Entity
 * Pure business object with validation rules and domain logic
 */

export class CreditCard {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly accountId: string,
    public readonly bank: string,
    public readonly lastFourDigits: string,
    public readonly creditLimit: number,
    public availableCredit: number, // Mutable - changes with transactions
    public currentBalance: number, // Mutable - changes with transactions
    public readonly cutoffDay: number,
    public readonly paymentDueDay: number,
    public readonly interestRate: number,
    public readonly minimumPaymentPercent: number,
    public readonly currency: string,
    public isActive: boolean, // Mutable - can be activated/deactivated
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates credit card business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Credit card name is required');
    }

    if (this.name.length > 50) {
      throw new Error('Credit card name cannot exceed 50 characters');
    }

    if (!this.accountId || this.accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    if (!this.bank || this.bank.trim().length === 0) {
      throw new Error('Bank name is required');
    }

    // Last four digits validation
    if (!this.lastFourDigits || !/^\d{4}$/.test(this.lastFourDigits)) {
      throw new Error('Last four digits must be exactly 4 numeric characters');
    }

    if (this.creditLimit <= 0) {
      throw new Error('Credit limit must be greater than 0');
    }

    if (this.availableCredit < 0) {
      throw new Error('Available credit cannot be negative');
    }

    if (this.availableCredit > this.creditLimit) {
      throw new Error('Available credit cannot exceed credit limit');
    }

    if (this.currentBalance < 0) {
      throw new Error('Current balance cannot be negative');
    }

    // Cutoff day validation (1-31)
    if (this.cutoffDay < 1 || this.cutoffDay > 31) {
      throw new Error('Cutoff day must be between 1 and 31');
    }

    // Payment due day validation (1-31)
    if (this.paymentDueDay < 1 || this.paymentDueDay > 31) {
      throw new Error('Payment due day must be between 1 and 31');
    }

    // Interest rate validation (0-100%)
    if (this.interestRate < 0 || this.interestRate > 100) {
      throw new Error('Interest rate must be between 0 and 100');
    }

    // Minimum payment percent validation (0-100%)
    if (this.minimumPaymentPercent <= 0 || this.minimumPaymentPercent > 100) {
      throw new Error('Minimum payment percent must be between 0 and 100');
    }

    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
  }

  /**
   * Calculates credit utilization percentage
   * @returns Utilization percentage (0-100)
   */
  getCreditUtilization(): number {
    const used = this.creditLimit - this.availableCredit;
    return (used / this.creditLimit) * 100;
  }

  /**
   * Checks if credit limit is approaching (>= threshold percentage)
   * @param thresholdPercent Threshold percentage (default: 80)
   * @returns True if utilization is at or above threshold
   */
  isCreditLimitApproaching(thresholdPercent: number = 80): boolean {
    return this.getCreditUtilization() >= thresholdPercent;
  }

  /**
   * Checks if credit limit is exceeded
   * @returns True if available credit is 0 or less
   */
  isCreditLimitExceeded(): boolean {
    return this.availableCredit <= 0;
  }

  /**
   * Calculates minimum payment based on current balance
   * @returns Minimum payment amount
   */
  calculateMinimumPayment(): number {
    return (this.currentBalance * this.minimumPaymentPercent) / 100;
  }

  /**
   * Calculates interest for the current balance
   * @param days Number of days (default: 30)
   * @returns Interest amount
   */
  calculateInterest(days: number = 30): number {
    if (days <= 0) {
      throw new Error('Days must be greater than 0');
    }

    // Annual interest rate converted to daily and multiplied by days
    const dailyRate = this.interestRate / 365 / 100;
    return this.currentBalance * dailyRate * days;
  }

  /**
   * Processes a charge (purchase) on the credit card
   * @param amount Charge amount
   * @throws Error if amount exceeds available credit
   */
  processCharge(amount: number): void {
    if (amount <= 0) {
      throw new Error('Charge amount must be greater than 0');
    }

    if (amount > this.availableCredit) {
      throw new Error('Charge amount exceeds available credit');
    }

    this.availableCredit -= amount;
    this.currentBalance += amount;
  }

  /**
   * Processes a payment on the credit card
   * @param amount Payment amount
   * @throws Error if payment amount is invalid
   */
  processPayment(amount: number): void {
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (amount > this.currentBalance) {
      throw new Error('Payment amount cannot exceed current balance');
    }

    this.currentBalance -= amount;
    this.availableCredit += amount;

    // Ensure available credit doesn't exceed limit due to rounding
    if (this.availableCredit > this.creditLimit) {
      this.availableCredit = this.creditLimit;
    }
  }

  /**
   * Gets the number of days until cutoff from a given date
   * @param currentDate Current date (defaults to now)
   * @returns Days until cutoff
   */
  getDaysUntilCutoff(currentDate: Date = new Date()): number {
    const currentDay = currentDate.getDate();

    if (currentDay < this.cutoffDay) {
      return this.cutoffDay - currentDay;
    } else if (currentDay === this.cutoffDay) {
      return 0;
    } else {
      // Next month
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      return daysInMonth - currentDay + this.cutoffDay;
    }
  }

  /**
   * Gets the number of days until payment due from a given date
   * @param currentDate Current date (defaults to now)
   * @returns Days until payment due
   */
  getDaysUntilPaymentDue(currentDate: Date = new Date()): number {
    const currentDay = currentDate.getDate();

    if (currentDay < this.paymentDueDay) {
      return this.paymentDueDay - currentDay;
    } else if (currentDay === this.paymentDueDay) {
      return 0;
    } else {
      // Next month
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      return daysInMonth - currentDay + this.paymentDueDay;
    }
  }

  /**
   * Checks if payment is due soon (within threshold days)
   * @param thresholdDays Days threshold (default: 3)
   * @returns True if payment is due within threshold
   */
  isPaymentDueSoon(thresholdDays: number = 3): boolean {
    const daysUntilDue = this.getDaysUntilPaymentDue();
    return daysUntilDue <= thresholdDays && this.currentBalance > 0;
  }

  /**
   * Activates the credit card
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Deactivates the credit card
   */
  deactivate(): void {
    this.isActive = false;
  }
}
