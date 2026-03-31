/**
 * Use Case: Get Balance History
 * Calculates balance evolution over time for charts
 */

import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Transaction } from '@/types/firestore';
import { Account } from '@/types/firestore';

export interface BalanceHistoryInput {
  userId: string;
  period: 'month' | 'quarter' | 'year';
  points?: number; // Number of data points (default based on period)
}

export interface BalanceDataPoint {
  date: string; // ISO date string
  balance: number;
  income: number;
  expenses: number;
}

export interface BalanceHistoryOutput {
  dataPoints: BalanceDataPoint[];
  startBalance: number;
  endBalance: number;
  trend: 'up' | 'down' | 'stable';
}

export class GetBalanceHistoryUseCase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private accountRepository: IAccountRepository
  ) {}

  async execute(input: BalanceHistoryInput): Promise<BalanceHistoryOutput> {
    const { userId, period, points } = input;

    // Determine number of data points and date range
    const config = this.getConfigForPeriod(period, points);
    const intervals = this.generateIntervals(config);
    
    // Get all transactions from the organization
    const allTransactions = await this.transactionRepository.getAll();
    const startDate = new Date(intervals[0].start);
    const endDate = new Date(intervals[intervals.length - 1].end);
    
    const relevantTransactions = allTransactions.filter((tx) => {
      const txDate = tx.date;
      return txDate >= startDate && txDate <= endDate;
    });

    // Get current account balances from the organization
    const accounts = await this.accountRepository.getAll();
    const currentBalance = accounts.reduce((sum: number, acc) => sum + acc.balance, 0);

    // Calculate balance at each interval
    const dataPoints: BalanceDataPoint[] = [];
    let runningBalance = currentBalance;

    // Process intervals in reverse (from newest to oldest)
    for (let i = intervals.length - 1; i >= 0; i--) {
      const interval = intervals[i];
      const intervalEnd = new Date(interval.end);
      
      // Get transactions in this interval
      const intervalTransactions = relevantTransactions.filter((tx) => {
        return tx.date >= new Date(interval.start) && tx.date <= intervalEnd;
      });

      // Calculate income and expenses for this interval
      const income = intervalTransactions
        .filter((tx) => tx.type === 'INCOME')
        .reduce((sum: number, tx) => sum + tx.amount, 0);
      
      const expenses = intervalTransactions
        .filter((tx) => tx.type === 'EXPENSE')
        .reduce((sum: number, tx) => sum + tx.amount, 0);

      // Store data point
      dataPoints.unshift({
        date: intervalEnd.toISOString(),
        balance: runningBalance,
        income,
        expenses,
      });

      // Adjust balance backwards for the next (previous) interval
      // Going backwards: remove income, add back expenses
      runningBalance = runningBalance - income + expenses;
    }

    // Calculate trend
    const startBalance = dataPoints[0]?.balance ?? currentBalance;
    const endBalance = dataPoints[dataPoints.length - 1]?.balance ?? currentBalance;
    const changePercent = startBalance > 0 ? ((endBalance - startBalance) / startBalance) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      dataPoints,
      startBalance,
      endBalance,
      trend,
    };
  }

  private getConfigForPeriod(period: 'month' | 'quarter' | 'year', points?: number) {
    switch (period) {
      case 'month':
        return {
          points: points ?? 30, // Daily points for a month
          intervalType: 'day' as const,
          daysPerInterval: 1,
        };
      case 'quarter':
        return {
          points: points ?? 12, // Weekly points for a quarter
          intervalType: 'week' as const,
          daysPerInterval: 7,
        };
      case 'year':
        return {
          points: points ?? 12, // Monthly points for a year
          intervalType: 'month' as const,
          daysPerInterval: 30,
        };
    }
  }

  private generateIntervals(config: { points: number; intervalType: string; daysPerInterval: number }) {
    const intervals: Array<{ start: Date; end: Date }> = [];
    const now = new Date();
    
    for (let i = config.points - 1; i >= 0; i--) {
      const end = new Date(now);
      const start = new Date(now);

      if (config.intervalType === 'month') {
        end.setMonth(end.getMonth() - i);
        end.setDate(1); // Start of month
        end.setHours(23, 59, 59, 999);
        
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else {
        // Day or week intervals
        const daysBack = i * config.daysPerInterval;
        start.setDate(start.getDate() - daysBack);
        start.setHours(0, 0, 0, 0);
        
        end.setDate(end.getDate() - daysBack);
        end.setHours(23, 59, 59, 999);
      }

      intervals.push({ start, end });
    }

    return intervals;
  }
}
