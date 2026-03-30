import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for getting current budget period
 */
export interface GetCurrentBudgetPeriodInput {
  userId: string;
  date?: Date;
}

/**
 * Output for getting current budget period
 */
export interface GetCurrentBudgetPeriodOutput {
  budgetPeriod: BudgetPeriod | null;
}

/**
 * Use Case: Get Current Budget Period
 * Retrieves the budget period that contains the current date (or specified date)
 */
export class GetCurrentBudgetPeriodUseCase extends BaseUseCase<
  GetCurrentBudgetPeriodInput,
  GetCurrentBudgetPeriodOutput
> {
  constructor(private budgetPeriodRepo: IBudgetPeriodRepository) {
    super();
  }

  async execute(input: GetCurrentBudgetPeriodInput): Promise<GetCurrentBudgetPeriodOutput> {
    const date = input.date ?? new Date();
    const budgetPeriod = await this.budgetPeriodRepo.getByDate(input.userId, date);

    return {
      budgetPeriod,
    };
  }
}
