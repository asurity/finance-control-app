import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category } from '@/types/firestore';

/**
 * Input for creating a category
 */
export interface CreateCategoryInput extends Omit<Category, 'id'> {}

/**
 * Output for category creation
 */
export interface CreateCategoryOutput {
  categoryId: string;
}

/**
 * Use Case: Create Category
 * Creates a new custom category (non-system)
 */
export class CreateCategoryUseCase extends BaseUseCase<CreateCategoryInput, CreateCategoryOutput> {
  constructor(private categoryRepo: ICategoryRepository) {
    super();
  }

  async execute(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    // Validate input
    this.validateInput(input);

    // Check for duplicate names
    const existingCategories = await this.categoryRepo.getAll();
    const duplicate = existingCategories.find(
      (cat) => cat.name.toLowerCase() === input.name.toLowerCase() && cat.type === input.type
    );

    if (duplicate) {
      throw new Error(
        `A ${input.type.toLowerCase()} category named "${input.name}" already exists`
      );
    }

    // Ensure custom categories are not marked as system
    const categoryData = {
      ...input,
      isSystem: false, // User-created categories are never system categories
    };

    // Create category
    const categoryId = await this.categoryRepo.create(categoryData);

    return { categoryId };
  }

  private validateInput(input: CreateCategoryInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (input.name.length > 50) {
      throw new Error('Category name cannot exceed 50 characters');
    }

    if (!input.type) {
      throw new Error('Category type is required (INCOME or EXPENSE)');
    }

    if (!['INCOME', 'EXPENSE'].includes(input.type)) {
      throw new Error('Category type must be either INCOME or EXPENSE');
    }

    // Validate icon (should be a single emoji or short string)
    if (input.icon && input.icon.length > 10) {
      throw new Error('Category icon should be a single emoji or short symbol');
    }

    // Validate color (should be a hex color code)
    if (input.color && !/^#[0-9A-F]{6}$/i.test(input.color)) {
      throw new Error('Category color must be a valid hex color code (e.g., #FF6B6B)');
    }
  }
}
