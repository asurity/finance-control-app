import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';

/**
 * Dashboard Statistics Output
 */
export interface DashboardStatistics {
  // Balance metrics
  currentBalance: number;
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
}

/**
 * Dashboard Statistics Input
 */
export interface GetDashboardStatisticsInput {
  userId: string;
  period: 'month' | 'quarter' | 'year';
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
    private alertRepo: IAlertRepository
  ) {
    super();
  }

  async execute(input: GetDashboardStatisticsInput): Promise<DashboardStatistics> {
    // Calculate date range based on period
    const { startDate, endDate, previousStartDate, previousEndDate } = 
      this.calculateDateRange(input.period);

    // Get transactions for current period
    const currentTransactions = await this.transactionRepo.getByDateRange(
      startDate,
      endDate
    );

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
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = userCurrentTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousIncome = userPreviousTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousExpenses = userPreviousTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get current balance from all accounts
    const accounts = await this.accountRepo.getActive();
    const currentBalance = await this.accountRepo.getNetWorth();

    // Calculate monthly change
    const currentPeriodBalance = totalIncome - totalExpenses;
    const previousPeriodBalance = previousIncome - previousExpenses;
    const monthlyChange = currentPeriodBalance - previousPeriodBalance;
    const monthlyChangePercent = previousPeriodBalance !== 0
      ? (monthlyChange / Math.abs(previousPeriodBalance)) * 100
      : 0;

    // Calculate savings rate
    const savingsRate = totalIncome > 0
      ? ((totalIncome - totalExpenses) / totalIncome) * 100
      : 0;

    // Get active budgets
    const activeBudgets = await this.budgetRepo.getActive(new Date());
    
    // Calculate average budget usage
    let totalBudgetUsage = 0;
    for (const budget of activeBudgets) {
      const budgetTransactions = userCurrentTransactions.filter(
        t => t.categoryId === budget.categoryId && t.type === 'EXPENSE'
      );
      const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      const usage = (spent / budget.amount) * 100;
      totalBudgetUsage += usage;
    }
    const budgetUsage = activeBudgets.length > 0
      ? totalBudgetUsage / activeBudgets.length
      : 0;

    // Get active alerts
    const unreadAlerts = await this.alertRepo.getUnread();
    // Show all organization alerts, not just user-specific ones
    const userAlerts = unreadAlerts;

    // Calculate pending payments (transactions with future dates or recurring)
    const now = new Date();
    const pendingPayments = userCurrentTransactions.filter(
      t => t.type === 'EXPENSE' && new Date(t.date) > now
    ).length;

    // Calculate top expense category
    const expensesByCategory: Record<string, { amount: number; count: number }> = {};
    
    userCurrentTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
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
      income: userCurrentTransactions.filter(t => t.type === 'INCOME').length,
      expense: userCurrentTransactions.filter(t => t.type === 'EXPENSE').length,
      total: userCurrentTransactions.length,
    };

    return {
      currentBalance,
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
    };
  }

  private calculateDateRange(period: 'month' | 'quarter' | 'year'): {
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
