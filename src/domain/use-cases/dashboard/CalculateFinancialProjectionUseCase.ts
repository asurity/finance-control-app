import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { startOfDay, endOfDay, differenceInDays, addDays } from 'date-fns';

/**
 * Financial Projection Output
 */
export interface FinancialProjection {
  currentPeriod: {
    name: string;
    startDate: Date;
    endDate: Date;
    totalBudget: number;
    daysTotal: number;
    daysElapsed: number;
    daysRemaining: number;
  } | null;
  spending: {
    totalSpent: number;
    dailyAverageSpent: number;
    projectedMonthTotal: number;
    budgetRemaining: number;
    dailyBudgetRemaining: number;
  };
  projection: {
    willExceedBudget: boolean;
    projectedExcessOrSavings: number;
    dayBudgetRunsOut: Date | null;
    safeToSpendToday: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'danger' | 'no-budget';
  message: string;
}

/**
 * Financial Projection Input
 */
export interface CalculateFinancialProjectionInput {
  userId: string;
  organizationId: string;
  referenceDate: Date;
}

/**
 * Use Case: Calculate Financial Projection
 * Answers: "Will my money last until the end of the month?"
 * Provides daily safe spending amount and projected savings/excess
 */
export class CalculateFinancialProjectionUseCase extends BaseUseCase<
  CalculateFinancialProjectionInput,
  FinancialProjection
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private budgetPeriodRepo: IBudgetPeriodRepository
  ) {
    super();
  }

  async execute(input: CalculateFinancialProjectionInput): Promise<FinancialProjection> {
    const { userId, organizationId, referenceDate } = input;

    // Get active budget period for the reference date using organization
    const activePeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, referenceDate);

    // No active period - return no-budget status
    if (!activePeriod) {
      return {
        currentPeriod: null,
        spending: {
          totalSpent: 0,
          dailyAverageSpent: 0,
          projectedMonthTotal: 0,
          budgetRemaining: 0,
          dailyBudgetRemaining: 0,
        },
        projection: {
          willExceedBudget: false,
          projectedExcessOrSavings: 0,
          dayBudgetRunsOut: null,
          safeToSpendToday: 0,
        },
        status: 'no-budget',
        message: 'No hay período de presupuesto activo',
      };
    }

    // Calculate period metrics
    const periodStart = new Date(activePeriod.startDate);
    const periodEnd = new Date(activePeriod.endDate);
    const today = startOfDay(referenceDate);

    const daysTotal = differenceInDays(periodEnd, periodStart) + 1;
    const daysElapsed = Math.min(differenceInDays(today, periodStart) + 1, daysTotal);
    const daysRemaining = Math.max(daysTotal - daysElapsed, 0);

    // Get all transactions in the period
    const transactions = await this.transactionRepo.getByDateRange(periodStart, endOfDay(today));

    // Calculate total spent
    const totalSpent = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate daily average (avoid division by zero)
    const dailyAverageSpent = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

    // Calculate total budget
    const totalBudget = activePeriod.totalAmount || 0;

    // Calculate projection
    const projectedMonthTotal = dailyAverageSpent * daysTotal;
    const budgetRemaining = totalBudget - totalSpent;
    const dailyBudgetRemaining = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;

    // Determine if will exceed budget
    const willExceedBudget = projectedMonthTotal > totalBudget;
    const projectedExcessOrSavings = totalBudget - projectedMonthTotal;

    // Calculate day budget runs out
    let dayBudgetRunsOut: Date | null = null;
    if (willExceedBudget && dailyAverageSpent > 0) {
      const daysUntilEmpty = Math.floor(budgetRemaining / dailyAverageSpent);
      dayBudgetRunsOut = addDays(today, daysUntilEmpty);

      // If day is after period end, set to null (you'll make it to the end)
      if (dayBudgetRunsOut > periodEnd) {
        dayBudgetRunsOut = null;
      }
    }

    // Calculate safe to spend today
    const safeToSpendToday = Math.max(dailyBudgetRemaining, 0);

    // Calculate spending rate vs prorated budget
    const proratedBudget = (totalBudget / daysTotal) * daysElapsed;
    const spendingRate = proratedBudget > 0 ? (totalSpent / proratedBudget) * 100 : 0;

    // Determine status
    let status: FinancialProjection['status'];
    let message: string;

    if (spendingRate < 70) {
      status = 'excellent';
      message =
        projectedExcessOrSavings > 0
          ? `¡Excelente! A este ritmo ahorrarás ${this.formatCurrency(projectedExcessOrSavings)}`
          : `Vas muy bien con el presupuesto`;
    } else if (spendingRate < 90) {
      status = 'good';
      message =
        projectedExcessOrSavings > 0
          ? `A este ritmo ahorrarás ${this.formatCurrency(projectedExcessOrSavings)}`
          : `Vas dentro del presupuesto`;
    } else if (spendingRate < 100) {
      status = 'warning';
      message =
        willExceedBudget && dayBudgetRunsOut
          ? `⚠️ El día ${dayBudgetRunsOut.getDate()} podrías quedarte sin presupuesto`
          : `Estás cerca del límite del presupuesto`;
    } else {
      status = 'danger';
      if (dayBudgetRunsOut) {
        const daysUntilEmpty = differenceInDays(dayBudgetRunsOut, today);
        message =
          daysUntilEmpty <= 0
            ? `🚨 Te excediste del presupuesto por ${this.formatCurrency(Math.abs(budgetRemaining))}`
            : `🚨 En ${daysUntilEmpty} día${daysUntilEmpty !== 1 ? 's' : ''} te quedas sin presupuesto`;
      } else {
        message = `🚨 Excederás el presupuesto por ${this.formatCurrency(Math.abs(projectedExcessOrSavings))}`;
      }
    }

    return {
      currentPeriod: {
        name: activePeriod.name || 'Período actual',
        startDate: periodStart,
        endDate: periodEnd,
        totalBudget,
        daysTotal,
        daysElapsed,
        daysRemaining,
      },
      spending: {
        totalSpent,
        dailyAverageSpent,
        projectedMonthTotal,
        budgetRemaining,
        dailyBudgetRemaining,
      },
      projection: {
        willExceedBudget,
        projectedExcessOrSavings,
        dayBudgetRunsOut,
        safeToSpendToday,
      },
      status,
      message,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
