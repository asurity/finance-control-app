import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';

/**
 * Input for seeding default categories
 */
export interface SeedDefaultCategoriesInput {
  userId: string;
}

/**
 * Output for category seeding
 */
export interface SeedDefaultCategoriesOutput {
  createdCount: number;
  skippedCount: number;
}

/**
 * Use Case: Seed Default Categories
 * Seeds the organization with default categories if none exist
 */
export class SeedDefaultCategoriesUseCase extends BaseUseCase<
  SeedDefaultCategoriesInput,
  SeedDefaultCategoriesOutput
> {
  constructor(private categoryRepo: ICategoryRepository) {
    super();
  }

  async execute(input: SeedDefaultCategoriesInput): Promise<SeedDefaultCategoriesOutput> {
    // Check if categories already exist
    const existingCategories = await this.categoryRepo.getAll();

    if (existingCategories.length > 0) {
      return {
        createdCount: 0,
        skippedCount: existingCategories.length,
      };
    }

    // Seed default categories
    await this.categoryRepo.seedDefaultCategories();

    // Get the count of created categories
    const categories = await this.categoryRepo.getAll();

    return {
      createdCount: categories.length,
      skippedCount: 0,
    };
  }
}
