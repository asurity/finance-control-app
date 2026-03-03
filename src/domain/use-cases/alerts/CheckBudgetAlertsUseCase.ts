import { BaseUseCase } from '../base/BaseUseCase';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for checking budget alerts
 */
export interface CheckBudgetAlertsInput {
  userId: string;
  thresholdPercent?: number; // Default 80%
}

/**
 * Output for budget alert checking
 */
export interface CheckBudgetAlertsOutput {
  createdAlerts: number;
  alertIds: string[];
}

/**
 * Use Case: Check Budget Alerts
 * Checks all active budgets and creates alerts if thresholds are exceeded
 */
export class CheckBudgetAlertsUseCase extends BaseUseCase<
  CheckBudgetAlertsInput,
  CheckBudgetAlertsOutput
> {
  constructor(
    private alertRepo: IAlertRepository,
    private budgetRepo: IBudgetRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: CheckBudgetAlertsInput): Promise<CheckBudgetAlertsOutput> {
    const threshold = input.thresholdPercent ?? 80;
    const alertIds: string[] = [];

    // Get all active budgets
    const activeBudgets = await this.budgetRepo.getActive(new Date());

    // Check each budget
    for (const budget of activeBudgets) {
      // Get transactions for this budget period and category
      const transactions = await this.transactionRepo.getByDateRange(
        budget.startDate,
        budget.endDate
      );

      const categoryTransactions = transactions.filter(
        t => t.categoryId === budget.categoryId && t.type === 'EXPENSE'
      );

      const spentAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const percentUsed = (spentAmount / budget.amount) * 100;

      // If threshold exceeded, create alert
      if (percentUsed >= threshold) {
        const alertId = await this.alertRepo.createBudgetAlert(
          budget.id,
          input.userId,
          budget.name ?? 'Sin nombre',
          percentUsed
        );

        alertIds.push(alertId);
      }
    }

    return {
      createdAlerts: alertIds.length,
      alertIds,
    };
  }
}
