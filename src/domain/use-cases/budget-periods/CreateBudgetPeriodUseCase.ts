import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for creating a budget period
 */
export interface CreateBudgetPeriodInput {
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  userId: string;
  organizationId?: string | null;
  name?: string;
  description?: string;
}

/**
 * Output for budget period creation
 */
export interface CreateBudgetPeriodOutput {
  budgetPeriodId: string;
  budgetPeriod: BudgetPeriod;
}

/**
 * Use Case: Create Budget Period
 * Handles budget period creation with validation for overlapping periods
 */
export class CreateBudgetPeriodUseCase extends BaseUseCase<
  CreateBudgetPeriodInput,
  CreateBudgetPeriodOutput
> {
  constructor(private budgetPeriodRepo: IBudgetPeriodRepository) {
    super();
  }

  async execute(input: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodOutput> {
    // Validate dates
    if (input.startDate >= input.endDate) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping budget periods
    // Use organization-based check if organizationId is provided (shared budgets)
    const hasOverlap = input.organizationId
      ? await this.budgetPeriodRepo.hasOverlapInOrganization(
          input.organizationId,
          input.startDate,
          input.endDate
        )
      : await this.budgetPeriodRepo.hasOverlap(input.userId, input.startDate, input.endDate);

    if (hasOverlap) {
      throw new Error('Budget period overlaps with an existing period');
    }

    // Create budget period entity
    const budgetPeriod = new BudgetPeriod(
      '', // ID will be assigned by repository
      input.totalAmount,
      input.startDate,
      input.endDate,
      input.userId,
      input.organizationId ?? null,
      input.name,
      input.description,
      new Date(),
      new Date()
    );

    // Save to repository
    const budgetPeriodId = await this.budgetPeriodRepo.create(budgetPeriod);

    // Retrieve the created budget period
    const createdBudgetPeriod = await this.budgetPeriodRepo.getById(budgetPeriodId);
    if (!createdBudgetPeriod) {
      throw new Error('Failed to retrieve created budget period');
    }

    return {
      budgetPeriodId,
      budgetPeriod: createdBudgetPeriod,
    };
  }
}
