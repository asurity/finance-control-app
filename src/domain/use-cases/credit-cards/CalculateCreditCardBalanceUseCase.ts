import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';

/**
 * Input for calculating credit card balance
 */
export interface CalculateCreditCardBalanceInput {
  creditCardId: string;
}

/**
 * Output with credit card balance details
 */
export interface CalculateCreditCardBalanceOutput {
  creditCardId: string;
  creditCardName: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  creditUtilization: number; // Percentage (0-100)
  minimumPayment: number;
  isActive: boolean;
}

/**
 * Use Case: Calculate Credit Card Balance
 * Calculates comprehensive credit card balance and utilization metrics
 */
export class CalculateCreditCardBalanceUseCase extends BaseUseCase<
  CalculateCreditCardBalanceInput,
  CalculateCreditCardBalanceOutput
> {
  constructor(private creditCardRepo: ICreditCardRepository) {
    super();
  }

  async execute(input: CalculateCreditCardBalanceInput): Promise<CalculateCreditCardBalanceOutput> {
    // Get credit card
    const creditCard = await this.creditCardRepo.getById(input.creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Calculate credit utilization percentage
    const creditUtilization = (creditCard.currentBalance / creditCard.creditLimit) * 100;

    // Calculate minimum payment
    const minimumPayment = this.calculateMinimumPayment(
      creditCard.currentBalance,
      creditCard.minimumPaymentPercent
    );

    return {
      creditCardId: creditCard.id,
      creditCardName: creditCard.name,
      creditLimit: creditCard.creditLimit,
      currentBalance: creditCard.currentBalance,
      availableCredit: creditCard.availableCredit,
      creditUtilization: Math.round(creditUtilization * 100) / 100, // Round to 2 decimals
      minimumPayment,
      isActive: creditCard.isActive,
    };
  }

  private calculateMinimumPayment(currentBalance: number, minimumPercent: number): number {
    // Calculate percentage-based minimum
    const percentagePayment = (currentBalance * minimumPercent) / 100;

    // Most credit cards have a minimum floor (e.g., $25)
    const MINIMUM_FLOOR = 25;

    // Return the greater of: percentage payment or minimum floor
    // But never more than the current balance
    return Math.min(
      Math.max(percentagePayment, MINIMUM_FLOOR),
      currentBalance
    );
  }
}
