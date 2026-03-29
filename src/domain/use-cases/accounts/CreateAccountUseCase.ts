import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Account } from '@/types/firestore';

/**
 * Input for creating an account
 */
export interface CreateAccountInput extends Omit<Account, 'id'> {}

/**
 * Output for account creation
 */
export interface CreateAccountOutput {
  accountId: string;
}

/**
 * Use Case: Create Account
 * Creates a new account with initial balance and configuration
 */
export class CreateAccountUseCase extends BaseUseCase<
  CreateAccountInput,
  CreateAccountOutput
> {
  constructor(private accountRepo: IAccountRepository) {
    super();
  }

  async execute(input: CreateAccountInput): Promise<CreateAccountOutput> {
    // Validate input data
    this.validateInput(input);

    // Create account
    const accountId = await this.accountRepo.create(input);

    return { accountId };
  }

  private validateInput(input: CreateAccountInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Account name is required');
    }

    if (input.name.length > 50) {
      throw new Error('Account name cannot exceed 50 characters');
    }

    if (!input.currency) {
      throw new Error('Currency is required');
    }

    // Credit card specific validation
    if (input.type === 'CREDIT_CARD') {
      if (input.creditLimit !== undefined && input.creditLimit <= 0) {
        throw new Error('Credit limit must be positive for credit card accounts');
      }

      if (input.cutoffDay !== undefined && (input.cutoffDay < 1 || input.cutoffDay > 31)) {
        throw new Error('Cutoff day must be between 1 and 31');
      }

      if (input.paymentDueDay !== undefined && (input.paymentDueDay < 1 || input.paymentDueDay > 31)) {
        throw new Error('Payment due day must be between 1 and 31');
      }
    }

    // Balance validation for non-credit card accounts
    if (input.type !== 'CREDIT_CARD' && input.balance < 0) {
      throw new Error('Initial balance cannot be negative for non-credit card accounts');
    }
  }
}
