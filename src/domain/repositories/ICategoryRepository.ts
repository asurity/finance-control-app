import { IRepository } from './IRepository';
import { Category, CategoryType } from '@/types/firestore';

/**
 * Category repository interface
 * 
 * Extends base repository with category-specific operations.
 */
export interface ICategoryRepository extends IRepository<Category> {
  /**
   * Gets categories by type (income or expense)
   * @param type - Category type
   * @returns Promise resolving to array of categories
   */
  getByType(type: CategoryType): Promise<Category[]>;

  /**
   * Gets default categories for seeding
   * @returns Promise resolving to array of default categories
   */
  getDefaultCategories(): Promise<Category[]>;

  /**
   * Seeds default categories for a new organization
   * @returns Promise resolving when seeding is complete
   */
  seedDefaultCategories(): Promise<void>;

  /**
   * Checks if a category is in use
   * @param categoryId - Category ID
   * @returns Promise resolving to true if category has transactions
   */
  isInUse(categoryId: string): Promise<boolean>;

  /**
   * Gets category usage statistics
   * @param categoryId - Category ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to usage statistics
   */
  getUsageStats(
    categoryId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
  }>;
}
