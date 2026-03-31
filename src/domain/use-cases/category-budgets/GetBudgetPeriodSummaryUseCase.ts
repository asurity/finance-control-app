import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for getting budget period summary
 */
export interface GetBudgetPeriodSummaryInput {
  budgetPeriodId: string;
}

/**
 * Category budget with status information
 */
export interface CategoryBudgetSummary {
  categoryBudget: CategoryBudget;
  remainingAmount: number;
  usagePercentage: number;
  isExceeded: boolean;
  isApproachingLimit: boolean;
}

/**
 * Output for budget period summary
 */
export interface GetBudgetPeriodSummaryOutput {
  budgetPeriod: BudgetPeriod;
  categoryBudgets: CategoryBudgetSummary[];
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePercentage: number;
  unallocatedPercentage: number;
  unallocatedAmount: number;
}

/**
 * Use Case: Get Budget Period Summary
 * Retrieves complete budget period information with all category budgets and statistics
 */
export class GetBudgetPeriodSummaryUseCase extends BaseUseCase<
  GetBudgetPeriodSummaryInput,
  GetBudgetPeriodSummaryOutput
> {
  constructor(
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryBudgetRepo: ICategoryBudgetRepository
  ) {
    super();
  }

  async execute(input: GetBudgetPeriodSummaryInput): Promise<GetBudgetPeriodSummaryOutput> {
    // Get budget period
    const budgetPeriod = await this.budgetPeriodRepo.getById(input.budgetPeriodId);
    if (!budgetPeriod) {
      throw new Error('Budget period not found');
    }

    // Get all category budgets for this period
    const categoryBudgets = await this.categoryBudgetRepo.getByBudgetPeriodId(input.budgetPeriodId);

    // Calculate summary statistics
    const totalAllocated = categoryBudgets.reduce((sum, cb) => sum + cb.allocatedAmount, 0);
    const totalSpent = categoryBudgets.reduce((sum, cb) => sum + cb.spentAmount, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const overallUsagePercentage =
      totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

    // Calculate unallocated
    const totalPercentage = categoryBudgets.reduce((sum, cb) => sum + cb.percentage, 0);
    const unallocatedPercentage = Math.max(0, 100 - totalPercentage);
    const unallocatedAmount = budgetPeriod.totalAmount - totalAllocated;

    // Build category summaries
    const categoryBudgetSummaries: CategoryBudgetSummary[] = categoryBudgets.map((cb) => ({
      categoryBudget: cb,
      remainingAmount: cb.getRemainingAmount(),
      usagePercentage: cb.getUsagePercentage(),
      isExceeded: cb.isExceeded(),
      isApproachingLimit: cb.isApproachingLimit(),
    }));

    return {
      budgetPeriod,
      categoryBudgets: categoryBudgetSummaries,
      totalAllocated,
      totalSpent,
      totalRemaining,
      overallUsagePercentage,
      unallocatedPercentage,
      unallocatedAmount,
    };
  }
}
