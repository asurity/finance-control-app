import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Transaction } from '@/types/firestore';

/**
 * Input for getting transactions by category
 */
export interface GetTransactionsByCategoryInput {
  categoryId: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Output for get transactions by category
 */
export interface GetTransactionsByCategoryOutput {
  transactions: Transaction[];
  count: number;
  totalAmount: number;
}

/**
 * Use Case: Get Transactions By Category
 * Retrieves all transactions for a specific category with optional date filtering
 */
export class GetTransactionsByCategoryUseCase extends BaseUseCase<
  GetTransactionsByCategoryInput,
  GetTransactionsByCategoryOutput
> {
  constructor(private transactionRepo: ITransactionRepository) {
    super();
  }

  async execute(input: GetTransactionsByCategoryInput): Promise<GetTransactionsByCategoryOutput> {
    if (!input.categoryId || input.categoryId.trim().length === 0) {
      throw new Error('Category ID is required');
    }

    // Get all transactions for the category
    const transactions = await this.transactionRepo.getByCategory(input.categoryId);

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

      filteredTransactions = transactions.filter((t) => {
        const transactionDate = t.date instanceof Date ? t.date : new Date(t.date);
        return transactionDate >= input.startDate! && transactionDate <= input.endDate!;
      });
    }

    // Calculate total amount
    const totalAmount = filteredTransactions.reduce((sum, transaction) => {
      return sum + transaction.amount;
    }, 0);

    // Sort by date descending
    filteredTransactions.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return {
      transactions: filteredTransactions,
      count: filteredTransactions.length,
      totalAmount,
    };
  }
}
