import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for getting a budget period
 */
export interface GetBudgetPeriodInput {
  id: string;
}

/**
 * Output for getting a budget period
 */
export interface GetBudgetPeriodOutput {
  budgetPeriod: BudgetPeriod;
}

/**
 * Use Case: Get Budget Period
 * Retrieves a specific budget period by ID
 */
export class GetBudgetPeriodUseCase extends BaseUseCase<
  GetBudgetPeriodInput,
  GetBudgetPeriodOutput
> {
  constructor(private budgetPeriodRepo: IBudgetPeriodRepository) {
    super();
  }

  async execute(input: GetBudgetPeriodInput): Promise<GetBudgetPeriodOutput> {
    const budgetPeriod = await this.budgetPeriodRepo.getById(input.id);
    if (!budgetPeriod) {
      throw new Error('Budget period not found');
    }

    return {
      budgetPeriod,
    };
  }
}
