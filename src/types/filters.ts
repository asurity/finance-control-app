/**
 * Transaction Filter Types
 * Shared types for transaction filtering across the application
 */

export interface TransactionFilterState {
  dateRange: { startDate: Date; endDate: Date };
  type: 'ALL' | 'INCOME' | 'EXPENSE';
  categoryId: string | null;
  accountId: string | null;
  searchText: string;
  minAmount: number | null;
  maxAmount: number | null;
}

export type DateRangePreset = 'today' | 'week' | 'month' | 'lastMonth' | 'last3Months' | 'custom';
