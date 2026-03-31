import { BaseUseCase } from '../base/BaseUseCase';
import { IRecurringTransactionRepository } from '@/domain/repositories/IRecurringTransactionRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Transaction, RecurringTransaction } from '@/types/firestore';

/**
 * Input for processing recurring transactions
 */
export interface ProcessRecurringTransactionsInput {
  currentDate?: Date;
}

/**
 * Output for processing recurring transactions
 */
export interface ProcessRecurringTransactionsOutput {
  processedCount: number;
  createdTransactionIds: string[];
  errors: Array<{ recurringTransactionId: string; error: string }>;
}

/**
 * Use Case: Process Recurring Transactions
 * Finds and processes all recurring transactions that are due
 */
export class ProcessRecurringTransactionsUseCase extends BaseUseCase<
  ProcessRecurringTransactionsInput,
  ProcessRecurringTransactionsOutput
> {
  constructor(
    private recurringTransactionRepo: IRecurringTransactionRepository,
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(
    input: ProcessRecurringTransactionsInput
  ): Promise<ProcessRecurringTransactionsOutput> {
    const currentDate = input.currentDate ?? new Date();
    const createdTransactionIds: string[] = [];
    const errors: Array<{ recurringTransactionId: string; error: string }> = [];

    // Get all recurring transactions due for processing
    const dueTransactions = await this.recurringTransactionRepo.getDueForProcessing(currentDate);

    // Process each one
    for (const recurring of dueTransactions) {
      try {
        // Create the actual transaction
        const transactionData: Omit<Transaction, 'id'> = {
          type: recurring.type,
          amount: recurring.amount,
          description: `Transacción recurrente: ${recurring.description}`,
          date: currentDate,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          userId: recurring.userId,
          tags: recurring.tags,
          isInstallment: false,
          isRecurring: true,
          recurringTransactionId: recurring.id,
        };

        const transactionId = await this.transactionRepo.create(transactionData);
        createdTransactionIds.push(transactionId);

        // Update account balance
        await this.updateAccountBalance(recurring.accountId, recurring.amount, recurring.type);

        // Update next occurrence date
        const nextDate = this.calculateNextOccurrence(recurring);
        await this.recurringTransactionRepo.updateNextOccurrence(recurring.id, nextDate);
      } catch (error) {
        errors.push({
          recurringTransactionId: recurring.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      processedCount: createdTransactionIds.length,
      createdTransactionIds,
      errors,
    };
  }

  private async updateAccountBalance(
    accountId: string,
    amount: number,
    type: 'INCOME' | 'EXPENSE'
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
  }

  private calculateNextOccurrence(recurring: RecurringTransaction): Date {
    const current = new Date(recurring.nextOccurrence);
    const next = new Date(current);

    switch (recurring.frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}
