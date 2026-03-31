/**
 * Category Budget DTOs
 * Data Transfer Objects for Category Budget operations
 */

/**
 * DTO for setting a new category budget
 */
export interface SetCategoryBudgetDTO {
  budgetPeriodId: string;
  categoryId: string;
  percentage: number;
  userId: string;
  organizationId?: string | null;
}

/**
 * DTO for updating a category budget percentage
 */
export interface UpdateCategoryBudgetPercentageDTO {
  id: string;
  percentage: number;
  userId: string;
}

/**
 * DTO for deleting a category budget
 */
export interface DeleteCategoryBudgetDTO {
  id: string;
  userId: string;
}

/**
 * DTO for getting category budget status
 */
export interface GetCategoryBudgetStatusDTO {
  id: string;
}

/**
 * DTO for getting budget period summary
 */
export interface GetBudgetPeriodSummaryDTO {
  budgetPeriodId: string;
}

/**
 * DTO for listing category budgets
 */
export interface ListCategoryBudgetsDTO {
  budgetPeriodId?: string;
  categoryId?: string;
  userId?: string;
}

/**
 * DTO for category budget response
 */
export interface CategoryBudgetResponseDTO {
  id: string;
  budgetPeriodId: string;
  categoryId: string;
  percentage: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  isExceeded: boolean;
  isApproachingLimit: boolean;
  exceededAmount: number;
  userId: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for budget period summary response
 */
export interface BudgetPeriodSummaryDTO {
  budgetPeriod: {
    id: string;
    totalAmount: number;
    startDate: Date;
    endDate: Date;
    name?: string;
    description?: string;
    isActive: boolean;
    durationInDays: number;
    remainingDays: number;
  };
  categoryBudgets: CategoryBudgetResponseDTO[];
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePercentage: number;
  unallocatedPercentage: number;
  unallocatedAmount: number;
}

/**
 * DTO for batch category budget creation
 */
export interface BatchSetCategoryBudgetsDTO {
  budgetPeriodId: string;
  userId: string;
  organizationId?: string | null;
  categories: {
    categoryId: string;
    percentage: number;
  }[];
}

/**
 * DTO for updating spent amount
 */
export interface UpdateSpentAmountDTO {
  id: string;
  spentAmount: number;
}
