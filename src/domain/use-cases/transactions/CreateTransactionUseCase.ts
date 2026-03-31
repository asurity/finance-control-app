import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { CheckBudgetAlertsUseCase } from '../alerts/CheckBudgetAlertsUseCase';
import { Transaction, TransactionType } from '@/types/firestore';

/**
 * Input DTO for creating a transaction
 */
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  accountId: string;
  categoryId: string;
  userId: string;
  notes?: string;
  tags?: string[];
  creditCardId?: string;
  isInstallment?: boolean;
  installments?: number;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
}

/**
 * Output for transaction creation
 */
export interface CreateTransactionOutput {
  transactionId: string;
  installmentGroupId?: string;
  installmentIds?: string[];
}

/**
 * Use Case: Create Transaction
 * Handles transaction creation with automatic account balance updates and budget tracking
 */
export class CreateTransactionUseCase extends BaseUseCase<
  CreateTransactionInput,
  CreateTransactionOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository,
    private budgetRepo?: IBudgetRepository,
    private budgetPeriodRepo?: IBudgetPeriodRepository,
    private categoryBudgetRepo?: ICategoryBudgetRepository,
    private checkBudgetAlertsUseCase?: CheckBudgetAlertsUseCase
  ) {
    super();
  }

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    // Validate account exists
    const accountExists = await this.accountRepo.exists(input.accountId);
    if (!accountExists) {
      throw new Error('Account not found');
    }

    // Get current account to check balance for expenses
    const account = await this.accountRepo.getById(input.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // For installment transactions, use the installment creation method
    if (input.installments && input.installments > 1) {
      const installmentIds = await this.transactionRepo.createInstallment(
        {
          type: input.type,
          amount: input.amount,
          description: input.description,
          date: input.date,
          accountId: input.accountId,
          categoryId: input.categoryId,
          userId: input.userId,
          tags: input.tags,
          creditCardId: input.creditCardId,
        },
        input.installments
      );

      // Get installment group ID from the created transactions
      const firstTransaction = await this.transactionRepo.getById(installmentIds[0]);
      const installmentGroupId = firstTransaction?.installmentGroupId ?? 'unknown';

      // Update account balance only with the first installment amount
      const firstInstallmentAmount = input.amount / input.installments;
      await this.updateAccountBalance(account.id, firstInstallmentAmount, input.type);

      return {
        transactionId: installmentIds[0],
        installmentGroupId,
        installmentIds,
      };
    }

    // Check balance for expenses
    if (input.type === 'EXPENSE') {
      // For credit cards and lines of credit, validate available credit
      if (account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT') {
        const availableCredit =
          account.availableCredit ??
          (account.creditLimit != null ? account.creditLimit - account.balance : undefined);
        if (availableCredit === undefined || availableCredit < input.amount) {
          throw new Error(
            `Insufficient credit. Available: ${(availableCredit ?? 0).toFixed(2)}, Required: ${input.amount.toFixed(2)}`
          );
        }
      } else {
        // For other account types, validate balance
        if (account.balance < input.amount) {
          throw new Error('Insufficient balance');
        }
      }
    }

    // Create the transaction
    const transactionData: Omit<Transaction, 'id'> = {
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      userId: input.userId,
      tags: input.tags,
      creditCardId: input.creditCardId,
      isInstallment: false,
    };

    const transactionId = await this.transactionRepo.create(transactionData);

    // Update account balance
    await this.updateAccountBalance(account.id, input.amount, input.type);

    // Update budget spent amount (only for EXPENSE transactions)
    if (input.type === 'EXPENSE') {
      await this.updateBudgetSpent(input.categoryId, input.amount, input.date);
      await this.updateCategoryBudget(input.userId, input.categoryId, input.amount, input.date);

      // Check budget alerts as a side-effect (don't fail transaction if alerts fail)
      if (this.checkBudgetAlertsUseCase) {
        try {
          await this.checkBudgetAlertsUseCase.execute({ userId: input.userId });
        } catch (error) {
          console.error('Error checking budget alerts:', error);
        }
      }
    }

    return { transactionId };
  }

  private async updateAccountBalance(
    accountId: string,
    amount: number,
    type: TransactionType
  ): Promise<void> {
    const account = await this.accountRepo.getById(accountId);
    if (!account) return;

    let newBalance = account.balance;

    if (type === 'INCOME') {
      newBalance += amount;
    } else if (type === 'EXPENSE') {
      newBalance -= amount;
    }

    await this.accountRepo.updateBalance(accountId, newBalance);

    // Update available credit for credit accounts
    if (account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT') {
      if (account.creditLimit !== undefined) {
        const newAvailableCredit = Math.max(0, account.creditLimit - Math.abs(newBalance));
        // Update availableCredit if the account repository supports it
        try {
          await this.accountRepo.update(accountId, {
            balance: newBalance,
            availableCredit: newAvailableCredit,
          });
        } catch (error) {
          console.error('Error updating available credit:', error);
          // Silently fail - balance was already updated
        }
      }
    }
  }

  /**
   * Updates the category budget spent amount for expense transactions
   * @private
   */
  private async updateCategoryBudget(
    userId: string,
    categoryId: string,
    amount: number,
    transactionDate: Date
  ): Promise<void> {
    // Skip if budget repositories are not available
    if (!this.budgetPeriodRepo || !this.categoryBudgetRepo) {
      return;
    }

    try {
      // Find the budget period that contains the transaction date
      const budgetPeriod = await this.budgetPeriodRepo.getByDate(userId, transactionDate);
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

      // Increment the spent amount
      await this.categoryBudgetRepo.incrementSpentAmount(categoryBudget.id, amount);
    } catch (error) {
      // Log error but don't fail the transaction creation
      console.error('Error updating category budget:', error);
    }
  }

  /**
   * Updates the budget spent amount for expense transactions
   * Finds active budgets for the category and updates their spent field
   * @private
   */
  private async updateBudgetSpent(
    categoryId: string,
    amount: number,
    transactionDate: Date
  ): Promise<void> {
    // Skip if budget repository is not available
    if (!this.budgetRepo) {
      return;
    }

    try {
      // Find active budgets for this category that contain the transaction date
      const activeBudgets = await this.budgetRepo.getActive(transactionDate);
      const categoryBudgets = activeBudgets.filter(
        (b) => b.categoryId === categoryId && b.isActive
      );

      // Update spent amount for each matching budget
      for (const budget of categoryBudgets) {
        await this.budgetRepo.updateSpent(budget.id, amount);
      }
    } catch (error) {
      // Log error but don't fail the transaction creation
      console.error('Error updating budget spent:', error);
    }
  }
}
