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
  userId: string;
  startDate: Date;
  endDate: Date;
  alertThreshold?: number; // Default: 80
  isActive?: boolean; // Default: true
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
  alertThreshold?: number;
  isActive?: boolean;
}

/**
 * DTO for budget usage query
 */
export interface GetBudgetUsageDTO {
  budgetId: string;
}
