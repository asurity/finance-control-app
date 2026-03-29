import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { CreditCard } from '@/types/firestore';

/**
 * Input for creating a credit card
 */
export interface CreateCreditCardInput {
  name: string;
  accountId: string;
  bank: string;
  lastFourDigits: string;
  creditLimit: number;
  availableCredit?: number;
  currentBalance?: number;
  cutoffDay: number;
  paymentDueDay: number;
  interestRate: number;
  minimumPaymentPercent: number;
  currency: string;
  isActive: boolean;
}

/**
 * Output for credit card creation
 */
export interface CreateCreditCardOutput {
  creditCardId: string;
}

/**
 * Use Case: Create Credit Card
 * Creates a new credit card linked to an account
 */
export class CreateCreditCardUseCase extends BaseUseCase<
  CreateCreditCardInput,
  CreateCreditCardOutput
> {
  constructor(
    private creditCardRepo: ICreditCardRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: CreateCreditCardInput): Promise<CreateCreditCardOutput> {
    // Validate input
    this.validateInput(input);

    // Verify linked account exists and is of type CREDIT_CARD
    const account = await this.accountRepo.getById(input.accountId);
    if (!account) {
      throw new Error('Linked account not found');
    }

    if (account.type !== 'CREDIT_CARD') {
      throw new Error('Linked account must be of type CREDIT_CARD');
    }

    // Verify account doesn't already have a credit card
    const allCreditCards = await this.creditCardRepo.getAll();
    const existingCard = allCreditCards.find(
      (card) => card.accountId === input.accountId
    );

    if (existingCard) {
      throw new Error('This account already has a credit card linked');
    }

    // Initialize available credit if not provided
    const creditCardData: Omit<CreditCard, 'id'> = {
      ...input,
      availableCredit: input.availableCredit ?? input.creditLimit,
      currentBalance: input.currentBalance ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create credit card
    const creditCardId = await this.creditCardRepo.create(creditCardData);

    return { creditCardId };
  }

  private validateInput(input: CreateCreditCardInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Credit card name is required');
    }

    if (input.name.length > 50) {
      throw new Error('Credit card name cannot exceed 50 characters');
    }

    if (!input.accountId) {
      throw new Error('Linked account is required');
    }

    if (!input.bank || input.bank.trim().length === 0) {
      throw new Error('Bank name is required');
    }

    // Last four digits validation
    if (!input.lastFourDigits || !/^\d{4}$/.test(input.lastFourDigits)) {
      throw new Error('Last four digits must be exactly 4 numeric characters');
    }

    if (input.creditLimit <= 0) {
      throw new Error('Credit limit must be greater than 0');
    }

    // Cutoff day validation (1-31)
    if (input.cutoffDay < 1 || input.cutoffDay > 31) {
      throw new Error('Cutoff day must be between 1 and 31');
    }

    // Payment due day validation (1-31)
    if (input.paymentDueDay < 1 || input.paymentDueDay > 31) {
      throw new Error('Payment due day must be between 1 and 31');
    }

    // Interest rate validation (0-100%)
    if (input.interestRate < 0 || input.interestRate > 100) {
      throw new Error('Interest rate must be between 0 and 100');
    }

    // Minimum payment percent validation (0-100%)
    if (input.minimumPaymentPercent <= 0 || input.minimumPaymentPercent > 100) {
      throw new Error('Minimum payment percent must be between 0 and 100');
    }
  }
}
