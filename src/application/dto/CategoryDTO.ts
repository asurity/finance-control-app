/**
 * Category DTOs
 * Data Transfer Objects for Category operations
 */

import { TransactionType } from '@/types/firestore';

/**
 * DTO for creating a new category
 */
export interface CreateCategoryDTO {
  name: string;
  type: TransactionType;
  userId: string;
  icon?: string;
  color?: string;
  description?: string;
  parentCategoryId?: string;
  isActive?: boolean;
}

/**
 * DTO for updating a category
 */
export interface UpdateCategoryDTO {
  id: string;
  name?: string;
  type?: TransactionType;
  icon?: string;
  color?: string;
  description?: string;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

/**
 * DTO for deleting a category
 */
export interface DeleteCategoryDTO {
  categoryId: string;
  force?: boolean;
  replacementCategoryId?: string;
}

/**
 * DTO for getting categories by type
 */
export interface GetCategoriesByTypeDTO {
  type: TransactionType;
  includeInactive?: boolean;
  includeSystem?: boolean;
}

/**
 * DTO for category usage statistics
 */
export interface CategoryUsageDTO {
  categoryId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * DTO for category hierarchy query
 */
export interface GetCategoryHierarchyDTO {
  parentId?: string;
  maxDepth?: number;
}
