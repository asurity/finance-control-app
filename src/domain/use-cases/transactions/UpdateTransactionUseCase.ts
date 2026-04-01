import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { Transaction as TransactionEntity } from '@/domain/entities/Transaction';
import { TransactionType } from '@/types/firestore';

/**
 * Input for updating a transaction
 */
export interface UpdateTransactionInput {
  transactionId: string;
  amount?: number;
  description?: string;
  date?: Date;
  accountId?: string;
  categoryId?: string;
  tags?: string[];
  receiptUrl?: string;
}

/**
 * Output for transaction update
 */
export interface UpdateTransactionOutput {
  transactionId: string;
  success: boolean;
}

/**
 * Use Case: Update Transaction
 * Handles transaction updates with automatic account balance adjustments
 */
export class UpdateTransactionUseCase extends BaseUseCase<
  UpdateTransactionInput,
  UpdateTransactionOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository,
    private budgetPeriodRepo?: IBudgetPeriodRepository,
    private categoryBudgetRepo?: ICategoryBudgetRepository
  ) {
    super();
  }

  async execute(input: UpdateTransactionInput): Promise<UpdateTransactionOutput> {
    // Get original transaction
    const originalTransaction = await this.transactionRepo.getById(input.transactionId);
    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }

    // Verify transaction can be edited (not part of paid installments)
    if (originalTransaction.isInstallment && originalTransaction.installmentNumber !== 1) {
      throw new Error(
        'Cannot edit installment transactions directly. Edit from first installment.'
      );
    }

    // Verify transaction is not from recurring (should be managed from recurring entity)
    if (originalTransaction.isRecurring) {
      throw new Error(
        'Cannot edit recurring transactions directly. Manage from recurring transaction.'
      );
    }

    // Handle account change
    if (input.accountId && input.accountId !== originalTransaction.accountId) {
      await this.handleAccountChange(
        originalTransaction,
        input.accountId,
        input.amount || originalTransaction.amount
      );
    }
    // Handle amount change on same account
    else if (input.amount && input.amount !== originalTransaction.amount) {
      await this.handleAmountChange(originalTransaction, input.amount);
    }

    // Update category budgets for EXPENSE transactions
    if (originalTransaction.type === 'EXPENSE') {
      const oldAccount = await this.accountRepo.getById(originalTransaction.accountId);
      const newAccountId = input.accountId || originalTransaction.accountId;
      const newAccount = input.accountId
        ? await this.accountRepo.getById(newAccountId)
        : oldAccount;

      if (newAccount) {
        await this.updateCategoryBudgets(
          newAccount.orgId,
          originalTransaction,
          input.categoryId || originalTransaction.categoryId,
          input.amount || originalTransaction.amount,
          input.date || originalTransaction.date
        );
      }
    }

    // Update transaction with new values
    await this.transactionRepo.update(input.transactionId, {
      amount: input.amount,
      description: input.description,
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      tags: input.tags,
      receiptUrl: input.receiptUrl,
    });

    return {
      transactionId: input.transactionId,
      success: true,
    };
  }

  /**
   * Handles account change: revert old account and apply to new account
   */
  private async handleAccountChange(
    originalTransaction: any,
    newAccountId: string,
    newAmount: number
  ): Promise<void> {
    // Get both accounts
    const oldAccount = await this.accountRepo.getById(originalTransaction.accountId);
    const newAccount = await this.accountRepo.getById(newAccountId);

    if (!oldAccount || !newAccount) {
      throw new Error('Account not found');
    }

    // Revert old account balance
    let oldAccountNewBalance = oldAccount.balance;
    if (originalTransaction.type === 'INCOME') {
      oldAccountNewBalance -= originalTransaction.amount;
    } else {
      oldAccountNewBalance += originalTransaction.amount;
    }

    // Apply to new account
    let newAccountNewBalance = newAccount.balance;
    if (originalTransaction.type === 'INCOME') {
      newAccountNewBalance += newAmount;
    } else {
      // Check if new account has sufficient balance (except for credit cards)
      if (newAccount.type !== 'CREDIT_CARD' && newAccount.balance < newAmount) {
        throw new Error('Insufficient balance in destination account');
      }
      newAccountNewBalance -= newAmount;
    }

    // Update both accounts
    await this.accountRepo.updateBalance(oldAccount.id, oldAccountNewBalance);
    await this.accountRepo.updateBalance(newAccount.id, newAccountNewBalance);
  }

  /**
   * Handles amount change on same account
   */
  private async handleAmountChange(originalTransaction: any, newAmount: number): Promise<void> {
    const account = await this.accountRepo.getById(originalTransaction.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate the difference
    const difference = newAmount - originalTransaction.amount;

    let newBalance = account.balance;
    if (originalTransaction.type === 'INCOME') {
      newBalance += difference; // More income = increase balance
    } else {
      // Check if there's sufficient balance for increased expense (except credit cards)
      if (account.type !== 'CREDIT_CARD' && difference > 0) {
        if (account.balance < difference) {
          throw new Error('Insufficient balance for increased expense amount');
        }
      }
      newBalance -= difference; // More expense = decrease balance
    }

    await this.accountRepo.updateBalance(account.id, newBalance);
  }

  /**
   * Updates category budgets when an EXPENSE transaction is modified
   * Handles changes in amount, category, and/or date
   */
  private async updateCategoryBudgets(
    organizationId: string | undefined,
    originalTransaction: any,
    newCategoryId: string,
    newAmount: number,
    newDate: Date
  ): Promise<void> {
    // Skip if budget repositories are not available or no organizationId
    if (!this.budgetPeriodRepo || !this.categoryBudgetRepo || !organizationId) {
      return;
    }

    try {
      const oldAmount = originalTransaction.amount;
      const oldCategoryId = originalTransaction.categoryId;
      const oldDate = originalTransaction.date;

      // Case 1: Category changed
      if (newCategoryId !== oldCategoryId) {
        // Decrement from old category
        await this.decrementCategoryBudget(
          organizationId,
          oldCategoryId,
          oldAmount,
          oldDate
        );
        // Increment to new category
        await this.incrementCategoryBudget(
          organizationId,
          newCategoryId,
          newAmount,
          newDate
        );
        return;
      }

      // Case 2: Date changed (might change budget period)
      if (newDate.getTime() !== oldDate.getTime()) {
        const oldPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, oldDate);
        const newPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, newDate);

        // If periods are different, move the transaction
        if (oldPeriod?.id !== newPeriod?.id) {
          // Decrement from old period
          if (oldPeriod) {
            await this.decrementCategoryBudget(organizationId, oldCategoryId, oldAmount, oldDate);
          }
          // Increment to new period
          if (newPeriod) {
            await this.incrementCategoryBudget(organizationId, newCategoryId, newAmount, newDate);
          }
          return;
        }
      }

      // Case 3: Only amount changed (same category, same period)
      if (newAmount !== oldAmount) {
        const difference = newAmount - oldAmount;
        const budgetPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, newDate);
        
        if (budgetPeriod) {
          const categoryBudget = await this.categoryBudgetRepo.getByBudgetPeriodAndCategory(
            budgetPeriod.id,
            newCategoryId
          );

          if (categoryBudget) {
            if (difference > 0) {
              // Amount increased, increment
              await this.categoryBudgetRepo.incrementSpentAmount(categoryBudget.id, difference);
            } else {
              // Amount decreased, decrement
              await this.categoryBudgetRepo.decrementSpentAmount(categoryBudget.id, Math.abs(difference));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating category budgets:', error);
    }
  }

  /**
   * Increments the category budget spent amount
   */
  private async incrementCategoryBudget(
    organizationId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date
  ): Promise<void> {
    try {
      const budgetPeriod = await this.budgetPeriodRepo!.getByDateAndOrganization(organizationId, transactionDate);
      if (!budgetPeriod) return;

      const categoryBudget = await this.categoryBudgetRepo!.getByBudgetPeriodAndCategory(
        budgetPeriod.id,
        categoryId
      );
      if (!categoryBudget) return;

      await this.categoryBudgetRepo!.incrementSpentAmount(categoryBudget.id, amount);
    } catch (error) {
      console.error('Error incrementing category budget:', error);
    }
  }

  /**
   * Decrements the category budget spent amount
   */
  private async decrementCategoryBudget(
    organizationId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date
  ): Promise<void> {
    try {
      const budgetPeriod = await this.budgetPeriodRepo!.getByDateAndOrganization(organizationId, transactionDate);
      if (!budgetPeriod) return;

      const categoryBudget = await this.categoryBudgetRepo!.getByBudgetPeriodAndCategory(
        budgetPeriod.id,
        categoryId
      );
      if (!categoryBudget) return;

      await this.categoryBudgetRepo!.decrementSpentAmount(categoryBudget.id, amount);
    } catch (error) {
      console.error('Error decrementing category budget:', error);
    }
  }
}
