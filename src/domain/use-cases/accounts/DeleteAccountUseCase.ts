import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for deleting an account
 */
export interface DeleteAccountInput {
  accountId: string;
  force?: boolean; // If true, allows deletion even with existing transactions
}

/**
 * Output for account deletion
 */
export interface DeleteAccountOutput {
  success: boolean;
  message: string;
}

/**
 * Use Case: Delete Account
 * Deletes an account after verifying it's safe to do so
 * By default, prevents deletion of accounts with transactions
 */
export class DeleteAccountUseCase extends BaseUseCase<
  DeleteAccountInput,
  DeleteAccountOutput
> {
  constructor(
    private accountRepo: IAccountRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: DeleteAccountInput): Promise<DeleteAccountOutput> {
    // Verify account exists
    const account = await this.accountRepo.getById(input.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if account has transactions
    const transactions = await this.transactionRepo.getAll({
      accountId: input.accountId,
    });

    if (transactions.length > 0 && !input.force) {
      throw new Error(
        `Cannot delete account with ${transactions.length} existing transactions. ` +
        'Use force=true to delete anyway, or transfer/delete transactions first.'
      );
    }

    // Check if account is linked to a credit card
    if (account.creditCardId) {
      throw new Error(
        'This account is linked to a credit card. ' +
        'Delete or unlink the credit card first.'
      );
    }

    // Warn if deleting an account with balance
    if (account.balance !== 0) {
      console.warn(
        `Deleting account "${account.name}" with non-zero balance: ${account.balance}`
      );
    }

    // Delete account
    await this.accountRepo.delete(input.accountId);

    return {
      success: true,
      message: `Account "${account.name}" deleted successfully`,
    };
  }
}
