/**
 * Transaction DTOs
 * Data Transfer Objects for Transaction operations
 */

import { TransactionType } from '@/types/firestore';

/**
 * DTO for creating a new transaction
 */
export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  accountId: string;
  categoryId: string;
  userId: string;
  tags?: string[];
  creditCardId?: string;
  installments?: number;
}

/**
 * DTO for updating a transaction
 */
export interface UpdateTransactionDTO {
  id: string;
  amount?: number;
  description?: string;
  date?: Date;
  accountId?: string;
  categoryId?: string;
  tags?: string[];
}

/**
 * DTO for deleting a transaction
 */
export interface DeleteTransactionDTO {
  id: string;
}

/**
 * DTO for transaction date range query
 */
export interface GetTransactionsByDateRangeDTO {
  startDate: Date;
  endDate: Date;
}
