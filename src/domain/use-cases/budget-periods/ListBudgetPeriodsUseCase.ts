import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for listing budget periods
 */
export interface ListBudgetPeriodsInput {
  userId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  activeOnly?: boolean;
}

/**
 * Output for listing budget periods
 */
export interface ListBudgetPeriodsOutput {
  budgetPeriods: BudgetPeriod[];
}

/**
 * Use Case: List Budget Periods
 * Retrieves budget periods for a user with optional filtering
 */
export class ListBudgetPeriodsUseCase extends BaseUseCase<
  ListBudgetPeriodsInput,
  ListBudgetPeriodsOutput
> {
  constructor(private budgetPeriodRepo: IBudgetPeriodRepository) {
    super();
  }

  async execute(input: ListBudgetPeriodsInput): Promise<ListBudgetPeriodsOutput> {
    let budgetPeriods: BudgetPeriod[];

    // Prioritize organizationId for shared budgets
    if (input.organizationId) {
      // Get active periods only if requested
      if (input.activeOnly) {
        budgetPeriods = await this.budgetPeriodRepo.getActiveByOrganizationId(
          input.organizationId
        );
      }
      // Get all periods for organization
      else {
        budgetPeriods = await this.budgetPeriodRepo.getByOrganizationId(input.organizationId);
      }
    }
    // Fallback to userId-based queries (legacy or personal budgets)
    else if (input.userId) {
      // Get active periods only if requested
      if (input.activeOnly) {
        budgetPeriods = await this.budgetPeriodRepo.getActiveByUserId(input.userId);
      }
      // Get periods within date range if provided
      else if (input.startDate && input.endDate) {
        budgetPeriods = await this.budgetPeriodRepo.getByDateRange(
          input.userId,
          input.startDate,
          input.endDate
        );
      }
      // Get all periods for user
      else {
        budgetPeriods = await this.budgetPeriodRepo.getByUserId(input.userId);
      }
    } else {
      throw new Error('Either userId or organizationId must be provided');
    }

    // Sort by start date descending (most recent first)
    budgetPeriods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    return {
      budgetPeriods,
    };
  }
}
