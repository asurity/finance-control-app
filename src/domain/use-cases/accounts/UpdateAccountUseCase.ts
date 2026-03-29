import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Account } from '@/types/firestore';

/**
 * Input for updating an account
 */
export interface UpdateAccountInput {
  id: string;
  data: Partial<Omit<Account, 'id' | 'balance'>>; // Balance can only be updated via transactions
}

/**
 * Output for account update
 */
export interface UpdateAccountOutput {
  accountId: string;
}

/**
 * Use Case: Update Account
 * Updates account information (name, type, limits, etc.)
 * Note: Balance updates are handled by transaction use cases
 */
export class UpdateAccountUseCase extends BaseUseCase<
  UpdateAccountInput,
  UpdateAccountOutput
> {
  constructor(private accountRepo: IAccountRepository) {
    super();
  }

  async execute(input: UpdateAccountInput): Promise<UpdateAccountOutput> {
    // Verify account exists
    const account = await this.accountRepo.getById(input.id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Validate update data
    this.validateInput(input.data, account);

    // Update account
    await this.accountRepo.update(input.id, input.data);

    return { accountId: input.id };
  }

  private validateInput(data: Partial<Account>, existingAccount: Account): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Account name cannot be empty');
      }
      if (data.name.length > 50) {
        throw new Error('Account name cannot exceed 50 characters');
      }
    }

    // Prevent changing account type if it has transactions
    // (This would require additional business logic to handle balance conversions)
    if (data.type !== undefined && data.type !== existingAccount.type) {
      // TODO: Check if account has transactions
      // For now, we allow it but this should be validated in production
      console.warn('Changing account type may affect existing transactions');
    }

    // Credit card specific validation
    if (data.creditLimit !== undefined && data.creditLimit <= 0) {
      throw new Error('Credit limit must be positive');
    }

    if (data.cutoffDay !== undefined && (data.cutoffDay < 1 || data.cutoffDay > 31)) {
      throw new Error('Cutoff day must be between 1 and 31');
    }

    if (data.paymentDueDay !== undefined && (data.paymentDueDay < 1 || data.paymentDueDay > 31)) {
      throw new Error('Payment due day must be between 1 and 31');
    }
  }
}
