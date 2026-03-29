import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Transaction } from '@/types/firestore';

/**
 * Input for getting transactions by account
 */
export interface GetTransactionsByAccountInput {
  accountId: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Output for get transactions by account
 */
export interface GetTransactionsByAccountOutput {
  transactions: Transaction[];
  count: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

/**
 * Use Case: Get Transactions By Account
 * Retrieves all transactions for a specific account with optional date filtering
 */
export class GetTransactionsByAccountUseCase extends BaseUseCase<
  GetTransactionsByAccountInput,
  GetTransactionsByAccountOutput
> {
  constructor(private transactionRepo: ITransactionRepository) {
    super();
  }

  async execute(
    input: GetTransactionsByAccountInput
  ): Promise<GetTransactionsByAccountOutput> {
    if (!input.accountId || input.accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    // Get all transactions for the account
    const transactions = await this.transactionRepo.getByAccount(input.accountId);

    // Filter by date range if provided
    let filteredTransactions = transactions;
    if (input.startDate && input.endDate) {
      // Validate dates
      if (!(input.startDate instanceof Date) || isNaN(input.startDate.getTime())) {
        throw new Error('Invalid start date');
      }

      if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) {
        throw new Error('Invalid end date');
      }

      filteredTransactions = transactions.filter(t => {
        const transactionDate = t.date instanceof Date ? t.date : new Date(t.date);
        return transactionDate >= input.startDate! && transactionDate <= input.endDate!;
      });
    }

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount;
      }
    });

    const netAmount = totalIncome - totalExpense;

    // Sort by date descending
    filteredTransactions.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return {
      transactions: filteredTransactions,
      count: filteredTransactions.length,
      totalIncome,
      totalExpense,
      netAmount,
    };
  }
}
