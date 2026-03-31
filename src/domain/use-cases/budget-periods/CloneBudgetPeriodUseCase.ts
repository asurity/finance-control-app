import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

export interface CloneBudgetPeriodInput {
  sourcePeriodId: string;
  newStartDate: Date;
  newEndDate: Date;
  newTotalAmount?: number;
  userId: string;
}

export interface CloneBudgetPeriodOutput {
  budgetPeriodId: string;
  categoryBudgetCount: number;
}

export class CloneBudgetPeriodUseCase extends BaseUseCase<
  CloneBudgetPeriodInput,
  CloneBudgetPeriodOutput
> {
  constructor(
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryBudgetRepo: ICategoryBudgetRepository
  ) {
    super();
  }

  async execute(input: CloneBudgetPeriodInput): Promise<CloneBudgetPeriodOutput> {
    if (input.newStartDate >= input.newEndDate) {
      throw new Error('End date must be after start date');
    }

    const sourcePeriod = await this.budgetPeriodRepo.getById(input.sourcePeriodId);
    if (!sourcePeriod) {
      throw new Error('Source budget period not found');
    }

    if (sourcePeriod.userId !== input.userId) {
      throw new Error('Unauthorized to clone this budget period');
    }

    // Check for overlap
    const hasOverlap = await this.budgetPeriodRepo.hasOverlap(
      input.userId,
      input.newStartDate,
      input.newEndDate
    );

    if (hasOverlap) {
      throw new Error('New budget period overlaps with an existing period');
    }

    const totalAmount = input.newTotalAmount ?? sourcePeriod.totalAmount;

    // Auto-generate name based on dates (basic format)
    const monthFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
    const capitalizedMonth = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const generatedName = `Copia de ${sourcePeriod.name || 'Período'} (${capitalizedMonth(monthFormatter.format(input.newStartDate))})`;

    const newPeriod = new BudgetPeriod(
      '',
      totalAmount,
      input.newStartDate,
      input.newEndDate,
      input.userId,
      sourcePeriod.organizationId,
      generatedName.slice(0, 100), // Max length is 100
      `Cloned from ${sourcePeriod.name || sourcePeriod.id}`,
      new Date(),
      new Date()
    );

    const budgetPeriodId = await this.budgetPeriodRepo.create(newPeriod);

    // Get source category budgets
    const sourceCategoryBudgets = await this.categoryBudgetRepo.getByBudgetPeriodId(
      input.sourcePeriodId
    );

    let cloneCount = 0;
    for (const sourceCb of sourceCategoryBudgets) {
      const allocatedAmount = CategoryBudget.calculateAllocatedAmount(
        totalAmount,
        sourceCb.percentage
      );

      const newCb = new CategoryBudget(
        '',
        budgetPeriodId,
        sourceCb.categoryId,
        sourceCb.percentage,
        allocatedAmount,
        0, // Reset spent amount
        input.userId,
        sourceCb.organizationId,
        new Date(),
        new Date()
      );

      await this.categoryBudgetRepo.create(newCb);
      cloneCount++;
    }

    return {
      budgetPeriodId,
      categoryBudgetCount: cloneCount,
    };
  }
}
