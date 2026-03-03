/**
 * Budget DTOs
 * Data Transfer Objects for Budget operations
 */

import { BudgetPeriod } from '@/types/firestore';

/**
 * DTO for creating a new budget
 */
export interface CreateBudgetDTO {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * DTO for updating a budget
 */
export interface UpdateBudgetDTO {
  id: string;
  name?: string;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: Date;
  endDate?: Date;
}

/**
 * DTO for budget usage query
 */
export interface GetBudgetUsageDTO {
  budgetId: string;
}
