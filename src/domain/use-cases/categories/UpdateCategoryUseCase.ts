import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category } from '@/types/firestore';

/**
 * Input for updating a category
 */
export interface UpdateCategoryInput {
  id: string;
  data: Partial<Omit<Category, 'id' | 'isSystem'>>; // Cannot change isSystem flag
}

/**
 * Output for category update
 */
export interface UpdateCategoryOutput {
  categoryId: string;
}

/**
 * Use Case: Update Category
 * Updates category information (name, icon, color)
 * Note: Cannot update system categories or change the type
 */
export class UpdateCategoryUseCase extends BaseUseCase<
  UpdateCategoryInput,
  UpdateCategoryOutput
> {
  constructor(private categoryRepo: ICategoryRepository) {
    super();
  }

  async execute(input: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
    // Verify category exists
    const category = await this.categoryRepo.getById(input.id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Prevent editing system categories
    if (category.isSystem) {
      throw new Error('System categories cannot be modified');
    }

    // Validate update data
    this.validateInput(input.data);

    // Check for duplicate names if name is being changed
    if (input.data.name && input.data.name !== category.name) {
      const existingCategories = await this.categoryRepo.getAll();
      const duplicate = existingCategories.find(
        (cat) =>
          cat.id !== input.id &&
          cat.name.toLowerCase() === input.data.name!.toLowerCase() &&
          cat.type === category.type
      );

      if (duplicate) {
        throw new Error(
          `A ${category.type.toLowerCase()} category named "${input.data.name}" already exists`
        );
      }
    }

    // Update category
    await this.categoryRepo.update(input.id, input.data);

    return { categoryId: input.id };
  }

  private validateInput(data: Partial<Category>): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Category name cannot be empty');
      }
      if (data.name.length > 50) {
        throw new Error('Category name cannot exceed 50 characters');
      }
    }

    if (data.icon !== undefined && data.icon.length > 10) {
      throw new Error('Category icon should be a single emoji or short symbol');
    }

    if (data.color !== undefined && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      throw new Error('Category color must be a valid hex color code');
    }

    // Prevent type changes
    if (data.type !== undefined) {
      throw new Error('Category type cannot be changed after creation');
    }
  }
}
