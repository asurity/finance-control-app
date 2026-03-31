import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { TransactionType } from '@/types/firestore';

/**
 * Input for category suggestion
 */
export interface SuggestCategoryInput {
  description: string;
  type: TransactionType;
  userId: string;
}

/**
 * Output for category suggestion
 */
export interface SuggestCategoryOutput {
  suggestedCategoryId: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Use Case: Suggest Category
 * Pattern matches transaction description against user's history
 * to suggest the most likely category. Simple and deterministic.
 */
export class SuggestCategoryUseCase extends BaseUseCase<
  SuggestCategoryInput,
  SuggestCategoryOutput
> {
  constructor(private transactionRepo: ITransactionRepository) {
    super();
  }

  async execute(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
    const searchTerms = input.description.toLowerCase().trim();

    if (searchTerms.length < 2) {
      return { suggestedCategoryId: null, confidence: 'low' };
    }

    // Get recent transactions for pattern matching (last 200)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const transactions = await this.transactionRepo.getByDateRange(startDate, endDate);

    // Filter to same type and user
    const userTransactions = transactions.filter(
      (t) => t.userId === input.userId && t.type === input.type
    );

    // Count category occurrences for matching descriptions
    const categoryCount: Record<string, number> = {};

    for (const t of userTransactions) {
      const desc = t.description.toLowerCase();
      // Exact match gets 3 points
      if (desc === searchTerms) {
        categoryCount[t.categoryId] = (categoryCount[t.categoryId] || 0) + 3;
      }
      // Contains match gets 1 point
      else if (desc.includes(searchTerms) || searchTerms.includes(desc)) {
        categoryCount[t.categoryId] = (categoryCount[t.categoryId] || 0) + 1;
      }
    }

    // Find the most frequent category
    const entries = Object.entries(categoryCount).sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      return { suggestedCategoryId: null, confidence: 'low' };
    }

    const [topCategoryId, topScore] = entries[0];
    const totalMatches = entries.reduce((sum, [, count]) => sum + count, 0);

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (topScore >= 3 && topScore / totalMatches >= 0.7) {
      confidence = 'high';
    } else if (topScore >= 2 || topScore / totalMatches >= 0.5) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return { suggestedCategoryId: topCategoryId, confidence };
  }
}
