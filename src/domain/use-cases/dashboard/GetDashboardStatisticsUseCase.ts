import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { startOfDay, eachDayOfInterval, format } from 'date-fns';

/**
 * Daily Accumulation Data Point
 */
export interface DailyAccumulation {
  date: string; // ISO format YYYY-MM-DD
  accumulatedIncome: number;
  accumulatedExpenses: number;
  dailyIncome: number;
  dailyExpenses: number;
}

/**
 * Dashboard Statistics Output
 */
export interface DashboardStatistics {
  // Balance metrics
  currentBalance: number; // Net worth (assets - liabilities)
  availableToSpend: number; // Cash + available credit
  totalIncome: number;
  totalExpenses: number;
  monthlyChange: number;
  monthlyChangePercent: number;

  // Savings metrics
  savingsRate: number;

  // Pending items
  pendingPayments: number;
  activeAlerts: number;

  // Budget tracking
  budgetUsage: number;

  // Top category
  topExpenseCategory: {
    name: string;
    categoryId: string;
    amount: number;
    percent: number;
  } | null;

  // Transaction counts
  transactionCounts: {
    income: number;
    expense: number;
    total: number;
  };

  // Daily accumulations for charts
  dailyAccumulations: DailyAccumulation[];
}

/**
 * Dashboard Statistics Input
 */
export interface GetDashboardStatisticsInput {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
}

/**
 * Use Case: Get Dashboard Statistics
 * Calculates all KPIs and metrics for the dashboard
 */
export class GetDashboardStatisticsUseCase extends BaseUseCase<
  GetDashboardStatisticsInput,
  DashboardStatistics
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository,
    private budgetRepo: IBudgetRepository,
    private alertRepo: IAlertRepository,
    private budgetPeriodRepo: IBudgetPeriodRepository
  ) {
    super();
  }

  async execute(input: GetDashboardStatisticsInput): Promise<DashboardStatistics> {
    // Try to get active budget period first (for custom date ranges like 26-26)
    const activeBudgetPeriod = await this.budgetPeriodRepo.getByDate(input.userId, new Date());
    
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (activeBudgetPeriod && input.period === 'month') {
      // Use the active budget period dates for 'month' view
      // console.log('Using active budget period:', {
      //   name: activeBudgetPeriod.name,
      //   startDate: activeBudgetPeriod.startDate,
      //   endDate: activeBudgetPeriod.endDate,
      // });
      
      startDate = new Date(activeBudgetPeriod.startDate);
      endDate = new Date(activeBudgetPeriod.endDate);
      
      // Calculate previous period (same duration backwards)
      const periodDuration = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1); // Day before current period
      previousStartDate = new Date(previousEndDate.getTime() - periodDuration);
    } else {
      // Fallback to default period calculation (week, quarter, year, or no active period)
      const dateRange = this.calculateDateRange(input.period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
      previousStartDate = dateRange.previousStartDate;
      previousEndDate = dateRange.previousEndDate;
    }

    // console.log('Dashboard period range:', {
    //   period: input.period,
    //   startDate: startDate.toISOString(),
    //   endDate: endDate.toISOString(),
    // });

    // Get transactions for current period
    const currentTransactions = await this.transactionRepo.getByDateRange(startDate, endDate);

    // Get transactions for previous period (for comparison)
    const previousTransactions = await this.transactionRepo.getByDateRange(
      previousStartDate,
      previousEndDate
    );

    // Use all transactions from the organization (not filtered by user)
    // This is important for multi-user organizations (e.g., family accounts)
    const userCurrentTransactions = currentTransactions;
    const userPreviousTransactions = previousTransactions;

    // Calculate income and expenses
    const totalIncome = userCurrentTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = userCurrentTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousIncome = userPreviousTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousExpenses = userPreviousTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get current balance from all accounts
    const accounts = await this.accountRepo.getActive();
    const currentBalance = await this.accountRepo.getNetWorth();
    const availableToSpend = await this.accountRepo.getAvailableToSpend();

    // Calculate monthly change
    const currentPeriodBalance = totalIncome - totalExpenses;
    const previousPeriodBalance = previousIncome - previousExpenses;
    const monthlyChange = currentPeriodBalance - previousPeriodBalance;
    const monthlyChangePercent =
      previousPeriodBalance !== 0 ? (monthlyChange / Math.abs(previousPeriodBalance)) * 100 : 0;

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Get active budgets
    const activeBudgets = await this.budgetRepo.getActive(new Date());

    // Calculate average budget usage using the spent amount already tracked in budgets
    let totalBudgetUsage = 0;
    for (const budget of activeBudgets) {
      // Use the spent amount already calculated and stored in the budget
      const usage = (budget.spent / budget.amount) * 100;
      totalBudgetUsage += usage;
    }
    const budgetUsage = activeBudgets.length > 0 ? totalBudgetUsage / activeBudgets.length : 0;

    // Get active alerts
    const unreadAlerts = await this.alertRepo.getUnread();
    // Show all organization alerts, not just user-specific ones
    const userAlerts = unreadAlerts;

    // Calculate pending payments (transactions with future dates or recurring)
    const now = new Date();
    const pendingPayments = userCurrentTransactions.filter(
      (t) => t.type === 'EXPENSE' && new Date(t.date) > now
    ).length;

    // Calculate top expense category
    const expensesByCategory: Record<string, { amount: number; count: number }> = {};

    userCurrentTransactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        if (!expensesByCategory[t.categoryId]) {
          expensesByCategory[t.categoryId] = { amount: 0, count: 0 };
        }
        expensesByCategory[t.categoryId].amount += t.amount;
        expensesByCategory[t.categoryId].count += 1;
      });

    let topExpenseCategory: DashboardStatistics['topExpenseCategory'] = null;
    let maxAmount = 0;

    for (const [categoryId, data] of Object.entries(expensesByCategory)) {
      if (data.amount > maxAmount) {
        maxAmount = data.amount;
        const percent = (data.amount / totalExpenses) * 100;
        topExpenseCategory = {
          name: 'Categoría', // Will be enriched in the hook
          categoryId,
          amount: data.amount,
          percent,
        };
      }
    }

    // Transaction counts
    const transactionCounts = {
      income: userCurrentTransactions.filter((t) => t.type === 'INCOME').length,
      expense: userCurrentTransactions.filter((t) => t.type === 'EXPENSE').length,
      total: userCurrentTransactions.length,
    };

    // Calculate daily accumulations for the period
    // Only show data up to today (don't show future dates)
    const today = new Date();
    const effectiveEndDate = endDate > today ? today : endDate;
    
    const dailyAccumulations = this.calculateDailyAccumulations(
      userCurrentTransactions,
      startDate,
      effectiveEndDate
    );

    return {
      currentBalance,
      availableToSpend,
      totalIncome,
      totalExpenses,
      monthlyChange,
      monthlyChangePercent,
      savingsRate: Math.round(savingsRate * 10) / 10,
      pendingPayments,
      activeAlerts: userAlerts.length,
      budgetUsage: Math.round(budgetUsage * 10) / 10,
      topExpenseCategory,
      transactionCounts,
      dailyAccumulations,
    };
  }

  /**
   * Calculate daily income and expense accumulations
   */
  private calculateDailyAccumulations(
    transactions: any[],
    startDate: Date,
    endDate: Date
  ): DailyAccumulation[] {
    try {
      // Validate dates
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date range for daily accumulations:', { startDate, endDate });
        return [];
      }

      // Get all days in the period
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      // Group transactions by day
      const dailyData: Record<string, { income: number; expenses: number }> = {};

      days.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        dailyData[dateKey] = { income: 0, expenses: 0 };
      });

    // Aggregate transactions by day
    transactions.forEach((transaction) => {
      try {
        // Handle Firestore Timestamp objects or Date objects
        let transactionDate: Date;
        if (transaction.date instanceof Date) {
          transactionDate = transaction.date;
        } else if (transaction.date?.toDate) {
          // Firestore Timestamp
          transactionDate = transaction.date.toDate();
        } else if (typeof transaction.date === 'string') {
          transactionDate = new Date(transaction.date);
        } else {
          console.warn('Invalid transaction date format:', transaction.date);
          return; // Skip this transaction
        }

        // Validate date is valid
        if (isNaN(transactionDate.getTime())) {
          console.warn('Invalid transaction date value:', transaction.date);
          return; // Skip this transaction
        }

        const dateKey = format(startOfDay(transactionDate), 'yyyy-MM-dd');

        if (dailyData[dateKey]) {
          if (transaction.type === 'INCOME') {
            dailyData[dateKey].income += transaction.amount;
          } else if (transaction.type === 'EXPENSE') {
            dailyData[dateKey].expenses += transaction.amount;
          }
        }
      } catch (error) {
        console.error('Error processing transaction date:', transaction.date, error);
      }
    });

    // Calculate accumulations
    let accumulatedIncome = 0;
    let accumulatedExpenses = 0;
    const result: DailyAccumulation[] = [];

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayData = dailyData[dateKey];

      accumulatedIncome += dayData.income;
      accumulatedExpenses += dayData.expenses;

      result.push({
        date: dateKey,
        accumulatedIncome,
        accumulatedExpenses,
        dailyIncome: dayData.income,
        dailyExpenses: dayData.expenses,
      });
    });

    return result;
    } catch (error) {
      console.error('Error calculating daily accumulations:', error);
      return [];
    }
  }

  private calculateDateRange(period: 'week' | 'month' | 'quarter' | 'year'): {
    startDate: Date;
    endDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);
    let previousEndDate = new Date(now);
    let previousStartDate = new Date(now);

    switch (period) {
      case 'week':
        // Week starts on Monday (0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysFromMonday);
        startDate.setHours(0, 0, 0, 0);

        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);

        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;

      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);

        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;

      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);

        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 3);

        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;

      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);

        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);

        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }
}
