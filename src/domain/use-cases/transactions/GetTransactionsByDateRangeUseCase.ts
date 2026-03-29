import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Transaction } from '@/types/firestore';

/**
 * Input for getting transactions by date range
 */
export interface GetTransactionsByDateRangeInput {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

/**
 * Output for get transactions by date range
 */
export interface GetTransactionsByDateRangeOutput {
  transactions: Transaction[];
  count: number;
}

/**
 * Use Case: Get Transactions By Date Range
 * Retrieves all transactions within a specified date range
 */
export class GetTransactionsByDateRangeUseCase extends BaseUseCase<
  GetTransactionsByDateRangeInput,
  GetTransactionsByDateRangeOutput
> {
  constructor(private transactionRepo: ITransactionRepository) {
    super();
  }

  async execute(
    input: GetTransactionsByDateRangeInput
  ): Promise<GetTransactionsByDateRangeOutput> {
    // Validate dates
    if (!(input.startDate instanceof Date) || isNaN(input.startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) {
      throw new Error('Invalid end date');
    }

    if (input.endDate < input.startDate) {
      throw new Error('End date must be after start date');
    }

    // Get transactions by date range
    const transactions = await this.transactionRepo.getByDateRange(
      input.startDate,
      input.endDate
    );

    // Filter by userId if provided
    let filteredTransactions = transactions;
    if (input.userId) {
      filteredTransactions = transactions.filter(t => t.userId === input.userId);
    }

    // Sort by date descending (newest first)
    filteredTransactions.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return {
      transactions: filteredTransactions,
      count: filteredTransactions.length,
    };
  }
}
