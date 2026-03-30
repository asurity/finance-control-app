import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';

/**
 * Input DTO for deleting a category budget
 */
export interface DeleteCategoryBudgetInput {
  id: string;
  userId: string;
}

/**
 * Output for category budget deletion
 */
export interface DeleteCategoryBudgetOutput {
  success: boolean;
}

/**
 * Use Case: Delete Category Budget
 * Handles category budget deletion with authorization check
 */
export class DeleteCategoryBudgetUseCase extends BaseUseCase<
  DeleteCategoryBudgetInput,
  DeleteCategoryBudgetOutput
> {
  constructor(private categoryBudgetRepo: ICategoryBudgetRepository) {
    super();
  }

  async execute(input: DeleteCategoryBudgetInput): Promise<DeleteCategoryBudgetOutput> {
    // Verify category budget exists and belongs to user
    const categoryBudget = await this.categoryBudgetRepo.getById(input.id);
    if (!categoryBudget) {
      throw new Error('Category budget not found');
    }

    if (categoryBudget.userId !== input.userId) {
      throw new Error('Unauthorized to delete this category budget');
    }

    // Delete the category budget
    await this.categoryBudgetRepo.delete(input.id);

    return {
      success: true,
    };
  }
}
