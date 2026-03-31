import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for deleting a category
 */
export interface DeleteCategoryInput {
  categoryId: string;
  force?: boolean; // If true, allows deletion even with existing transactions
}

/**
 * Output for category deletion
 */
export interface DeleteCategoryOutput {
  success: boolean;
  message: string;
}

/**
 * Use Case: Delete Category
 * Deletes a custom category after verifying it's safe to do so
 * Cannot delete system categories or categories with transactions
 */
export class DeleteCategoryUseCase extends BaseUseCase<DeleteCategoryInput, DeleteCategoryOutput> {
  constructor(
    private categoryRepo: ICategoryRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: DeleteCategoryInput): Promise<DeleteCategoryOutput> {
    // Verify category exists
    const category = await this.categoryRepo.getById(input.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Prevent deletion of system categories
    if (category.isSystem) {
      throw new Error('System categories cannot be deleted');
    }

    // Check if category has transactions
    const transactions = await this.transactionRepo.getAll({
      categoryId: input.categoryId,
    });

    if (transactions.length > 0 && !input.force) {
      throw new Error(
        `Cannot delete category with ${transactions.length} existing transactions. ` +
          'Use force=true to delete anyway, or reassign transactions to another category first.'
      );
    }

    if (transactions.length > 0 && input.force) {
      console.warn(
        `Force-deleting category "${category.name}" with ${transactions.length} transactions. ` +
          'These transactions will lose their category reference.'
      );
    }

    // Delete category
    await this.categoryRepo.delete(input.categoryId);

    return {
      success: true,
      message: `Category "${category.name}" deleted successfully`,
    };
  }
}
