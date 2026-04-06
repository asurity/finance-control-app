import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';

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
    private accountRepo: IAccountRepository,
    private budgetPeriodRepo?: IBudgetPeriodRepository,
    private categoryBudgetRepo?: ICategoryBudgetRepository
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

    // Decrement category budget spent amount if it was an expense
    if (transaction.type === 'EXPENSE') {
      await this.decrementCategoryBudget(
        account.orgId,
        transaction.categoryId,
        transaction.amount,
        transaction.date
      );
    }

    // Delete the transaction
    await this.transactionRepo.delete(input.transactionId);

    return { success: true };
  }

  /**
   * Decrements the category budget spent amount for deleted expense transactions
   * @private
   */
  private async decrementCategoryBudget(
    organizationId: string | undefined,
    categoryId: string,
    amount: number,
    transactionDate: Date
  ): Promise<void> {
    // Skip if budget repositories are not available or no organizationId
    if (!this.budgetPeriodRepo || !this.categoryBudgetRepo || !organizationId) {
      return;
    }

    try {
      // Find the budget period that contains the transaction date for this organization
      const budgetPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, transactionDate);
      if (!budgetPeriod) {
        // No budget period configured for this date, skip tracking
        return;
      }

      // Find the category budget for this category in the budget period
      const categoryBudget = await this.categoryBudgetRepo.getByBudgetPeriodAndCategory(
        budgetPeriod.id,
        categoryId
      );
      if (!categoryBudget) {
        // No budget configured for this category, skip tracking
        return;
      }

      // Decrement the spent amount
      await this.categoryBudgetRepo.decrementSpentAmount(categoryBudget.id, amount);
    } catch (error) {
      // Log error but don't fail the transaction deletion
      console.error('Error decrementing category budget:', error);
    }
  }
}
