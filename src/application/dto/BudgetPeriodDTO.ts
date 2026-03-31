/**
 * Budget Period DTOs
 * Data Transfer Objects for Budget Period operations
 */

/**
 * DTO for creating a new budget period
 */
export interface CreateBudgetPeriodDTO {
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  userId: string;
  organizationId?: string | null;
  name?: string;
  description?: string;
}

/**
 * DTO for updating a budget period
 */
export interface UpdateBudgetPeriodDTO {
  id: string;
  totalAmount?: number;
  startDate?: Date;
  endDate?: Date;
  name?: string;
  description?: string;
}

/**
 * DTO for deleting a budget period
 */
export interface DeleteBudgetPeriodDTO {
  id: string;
  userId: string;
}

/**
 * DTO for getting a budget period
 */
export interface GetBudgetPeriodDTO {
  id: string;
}

/**
 * DTO for listing budget periods
 */
export interface ListBudgetPeriodsDTO {
  userId: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  activeOnly?: boolean;
}

/**
 * DTO for getting current budget period
 */
export interface GetCurrentBudgetPeriodDTO {
  userId: string;
  date?: Date;
}

/**
 * DTO for budget period response
 */
export interface BudgetPeriodResponseDTO {
  id: string;
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  userId: string;
  organizationId: string | null;
  name?: string;
  description?: string;
  isActive: boolean;
  durationInDays: number;
  remainingDays: number;
  timeProgressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CloneBudgetPeriodDTO {
  sourcePeriodId: string;
  newStartDate: Date;
  newEndDate: Date;
  newTotalAmount?: number;
  userId: string;
}

export interface CheckPeriodExpirationDTO {
  userId: string;
}

export interface SuggestCategoryBudgetsDTO {
  userId: string;
  startDate: Date;
  endDate: Date;
}
