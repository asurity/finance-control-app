import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';

export interface SuggestCategoryBudgetsInput {
  userId: string;
  startDate: Date;
  endDate: Date;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  suggestedPercentage: number;
  historicalAmount: number;
}

export class SuggestCategoryBudgetsUseCase extends BaseUseCase<
  SuggestCategoryBudgetsInput,
  CategorySuggestion[]
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private categoryRepo: ICategoryRepository
  ) {
    super();
  }

  async execute(input: SuggestCategoryBudgetsInput): Promise<CategorySuggestion[]> {
    if (input.startDate >= input.endDate) {
      throw new Error('End date must be after start date');
    }

    // Calculate length of the target period in days
    const durationTime = input.endDate.getTime() - input.startDate.getTime();

    // Go back by that same duration to get historical transactions
    const prevEndDate = new Date(input.startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - durationTime);

    const historicalTransactions = await this.transactionRepo.getByDateRange(
      prevStartDate,
      prevEndDate
    );

    // Filter EXPENSE transactions for the user
    // Note: the repository might not have a combined filter, so we filter in memory
    const userExpenses = historicalTransactions.filter(
      (t) => t.userId === input.userId && t.type === 'EXPENSE'
    );

    if (userExpenses.length === 0) {
      return [];
    }

    // Group by category
    let totalExpenseAmount = 0;
    const categoryTotals = new Map<string, number>();

    for (const t of userExpenses) {
      if (!t.categoryId) continue;

      const currentTotal = categoryTotals.get(t.categoryId) || 0;
      categoryTotals.set(t.categoryId, currentTotal + t.amount);
      totalExpenseAmount += t.amount;
    }

    if (totalExpenseAmount === 0) {
      return [];
    }

    // Retrieve categories
    const categories = await this.categoryRepo.getByType('EXPENSE');
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const suggestions: CategorySuggestion[] = [];

    for (const [categoryId, amount] of categoryTotals.entries()) {
      const percentage = Math.round((amount / totalExpenseAmount) * 100);

      // Skip very small percentages
      if (percentage < 1) continue;

      suggestions.push({
        categoryId,
        categoryName: categoryMap.get(categoryId) || 'Categoría Desconocida',
        suggestedPercentage: percentage,
        historicalAmount: amount,
      });
    }

    // Sort by percentage descending
    suggestions.sort((a, b) => b.suggestedPercentage - a.suggestedPercentage);

    return suggestions;
  }
}
