import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { CreditCard } from '@/types/firestore';

/**
 * Input for updating a credit card
 */
export interface UpdateCreditCardInput {
  id: string;
  data: Partial<Omit<CreditCard, 'id' | 'accountId' | 'createdAt' | 'updatedAt'>>;
}

/**
 * Output for credit card update
 */
export interface UpdateCreditCardOutput {
  creditCardId: string;
}

/**
 * Use Case: Update Credit Card
 * Updates credit card information (limits, dates, rates, etc.)
 * Note: Cannot change the linked account
 */
export class UpdateCreditCardUseCase extends BaseUseCase<
  UpdateCreditCardInput,
  UpdateCreditCardOutput
> {
  constructor(private creditCardRepo: ICreditCardRepository) {
    super();
  }

  async execute(input: UpdateCreditCardInput): Promise<UpdateCreditCardOutput> {
    // Verify credit card exists
    const creditCard = await this.creditCardRepo.getById(input.id);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Validate update data
    this.validateInput(input.data);

    // Special handling for credit limit changes
    if (input.data.creditLimit !== undefined) {
      // Adjust available credit proportionally
      const oldLimit = creditCard.creditLimit;
      const newLimit = input.data.creditLimit;
      const usedCredit = oldLimit - creditCard.availableCredit;

      input.data.availableCredit = Math.max(0, newLimit - usedCredit);
    }

    // Update credit card
    await this.creditCardRepo.update(input.id, input.data);

    return { creditCardId: input.id };
  }

  private validateInput(data: Partial<CreditCard>): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Credit card name cannot be empty');
      }
      if (data.name.length > 50) {
        throw new Error('Credit card name cannot exceed 50 characters');
      }
    }

    if (data.bank !== undefined && (!data.bank || data.bank.trim().length === 0)) {
      throw new Error('Bank name cannot be empty');
    }

    if (data.lastFourDigits !== undefined && !/^\d{4}$/.test(data.lastFourDigits)) {
      throw new Error('Last four digits must be exactly 4 numeric characters');
    }

    if (data.creditLimit !== undefined && data.creditLimit <= 0) {
      throw new Error('Credit limit must be greater than 0');
    }

    if (data.cutoffDay !== undefined && (data.cutoffDay < 1 || data.cutoffDay > 31)) {
      throw new Error('Cutoff day must be between 1 and 31');
    }

    if (data.paymentDueDay !== undefined && (data.paymentDueDay < 1 || data.paymentDueDay > 31)) {
      throw new Error('Payment due day must be between 1 and 31');
    }

    if (data.interestRate !== undefined && (data.interestRate < 0 || data.interestRate > 100)) {
      throw new Error('Interest rate must be between 0 and 100');
    }

    if (
      data.minimumPaymentPercent !== undefined &&
      (data.minimumPaymentPercent <= 0 || data.minimumPaymentPercent > 100)
    ) {
      throw new Error('Minimum payment percent must be between 0 and 100');
    }
  }
}
