import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';

/**
 * Input for deleting a transaction
 */
export interface DeleteTransactionInput {
  transactionId: string;
}

/**
 * Output for transaction deletion
 */
export interface DeleteTransactionOutput {
  success: boolean;
}

/**
 * Use Case: Delete Transaction
 * Handles transaction deletion with automatic account balance reversion
 */
export class DeleteTransactionUseCase extends BaseUseCase<
  DeleteTransactionInput,
  DeleteTransactionOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: DeleteTransactionInput): Promise<DeleteTransactionOutput> {
    // Get the transaction to revert the balance
    const transaction = await this.transactionRepo.getById(input.transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get the account
    const account = await this.accountRepo.getById(transaction.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Revert the balance change
    let newBalance = account.balance;
    if (transaction.type === 'INCOME') {
      newBalance -= transaction.amount; // Subtract the income
    } else if (transaction.type === 'EXPENSE') {
      newBalance += transaction.amount; // Add back the expense
    }

    // Update the account balance
    await this.accountRepo.updateBalance(account.id, newBalance);

    // Delete the transaction
    await this.transactionRepo.delete(input.transactionId);

    return { success: true };
  }
}
