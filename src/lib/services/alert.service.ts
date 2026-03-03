// Alert Service - Proactive notification system
// Manages all types of financial alerts and user preferences

import { BaseService } from './base.service';
import { Alert, AlertSettings, AlertType, AlertPriority } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';

export class AlertService extends BaseService<Alert> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/alerts`);
  }

  /**
   * Get alerts by user
   */
  async getByUser(userId: string): Promise<Alert[]> {
    return this.query([where('userId', '==', userId), orderBy('createdAt', 'desc')]);
  }

  /**
   * Get unread alerts for a user
   */
  async getUnread(userId: string): Promise<Alert[]> {
    return this.query([
      where('userId', '==', userId),
      where('isRead', '==', false),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc'),
    ]);
  }

  /**
   * Get alerts by type
   */
  async getByType(userId: string, type: AlertType): Promise<Alert[]> {
    return this.query([
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
    ]);
  }

  /**
   * Get alerts by priority
   */
  async getByPriority(userId: string, priority: AlertPriority): Promise<Alert[]> {
    return this.query([
      where('userId', '==', userId),
      where('priority', '==', priority),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc'),
    ]);
  }

  /**
   * Get high priority and urgent unread alerts
   */
  async getUrgent(userId: string): Promise<Alert[]> {
    const alerts = await this.getUnread(userId);
    return alerts.filter((a) => a.priority === 'HIGH' || a.priority === 'URGENT');
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string): Promise<void> {
    await this.update(alertId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  /**
   * Mark multiple alerts as read
   */
  async markMultipleAsRead(alertIds: string[]): Promise<void> {
    const promises = alertIds.map((id) => this.markAsRead(id));
    await Promise.all(promises);
  }

  /**
   * Archive an alert
   */
  async archive(alertId: string): Promise<void> {
    await this.update(alertId, {
      isArchived: true,
      archivedAt: new Date(),
    });
  }

  /**
   * Create a budget threshold alert
   */
  async createBudgetAlert(
    userId: string,
    budgetId: string,
    budgetName: string,
    usagePercent: number,
    threshold: number
  ): Promise<string> {
    const priority: AlertPriority = usagePercent >= 100 ? 'URGENT' : usagePercent >= 90 ? 'HIGH' : 'MEDIUM';

    const alert: Omit<Alert, 'id'> = {
      type: 'BUDGET_THRESHOLD',
      priority,
      title: usagePercent >= 100 ? '¡Presupuesto excedido!' : 'Presupuesto cerca del límite',
      message: `El presupuesto "${budgetName}" está al ${usagePercent.toFixed(
        1
      )}% de su límite (umbral: ${threshold}%)`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'budget',
      relatedEntityId: budgetId,
      thresholdPercent: threshold,
      createdAt: new Date(),
    };

    return this.create(alert);
  }

  /**
   * Create a payment due alert
   */
  async createPaymentDueAlert(
    userId: string,
    entityType: 'account' | 'creditCard',
    entityId: string,
    entityName: string,
    dueDate: Date,
    amount: number
  ): Promise<string> {
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const priority: AlertPriority = daysUntilDue <= 1 ? 'URGENT' : daysUntilDue <= 3 ? 'HIGH' : 'MEDIUM';

    const alert: Omit<Alert, 'id'> = {
      type: 'PAYMENT_DUE',
      priority,
      title: daysUntilDue === 0 ? '¡Pago vence hoy!' : `Pago próximo a vencer`,
      message: `El pago de "${entityName}" vence en ${daysUntilDue} día(s). Monto: $${amount.toLocaleString(
        'es-CL'
      )}`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      createdAt: new Date(),
    };

    return this.create(alert);
  }

  /**
   * Create a low balance alert
   */
  async createLowBalanceAlert(
    userId: string,
    accountId: string,
    accountName: string,
    currentBalance: number,
    threshold: number
  ): Promise<string> {
    const alert: Omit<Alert, 'id'> = {
      type: 'LOW_BALANCE',
      priority: 'HIGH',
      title: 'Saldo bajo en cuenta',
      message: `La cuenta "${accountName}" tiene un saldo de $${currentBalance.toLocaleString(
        'es-CL'
      )} (umbral: $${threshold.toLocaleString('es-CL')})`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'account',
      relatedEntityId: accountId,
      createdAt: new Date(),
    };

    return this.create(alert);
  }

  /**
   * Create an unusual expense alert
   */
  async createUnusualExpenseAlert(
    userId: string,
    transactionId: string,
    amount: number,
    averageAmount: number,
    categoryName: string
  ): Promise<string> {
    const multiplier = (amount / averageAmount).toFixed(1);

    const alert: Omit<Alert, 'id'> = {
      type: 'UNUSUAL_EXPENSE',
      priority: 'MEDIUM',
      title: 'Gasto inusual detectado',
      message: `Gasto de $${amount.toLocaleString(
        'es-CL'
      )} en "${categoryName}" (${multiplier}x el promedio de $${averageAmount.toLocaleString('es-CL')})`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'transaction',
      relatedEntityId: transactionId,
      createdAt: new Date(),
    };

    return this.create(alert);
  }

  /**
   * Create a savings goal alert
   */
  async createSavingsGoalAlert(
    userId: string,
    goalId: string,
    goalName: string,
    currentAmount: number,
    targetAmount: number,
    isCompleted: boolean
  ): Promise<string> {
    const percent = (currentAmount / targetAmount) * 100;

    const alert: Omit<Alert, 'id'> = {
      type: 'SAVINGS_GOAL',
      priority: isCompleted ? 'HIGH' : 'LOW',
      title: isCompleted ? '¡Meta de ahorro alcanzada!' : 'Progreso en meta de ahorro',
      message: isCompleted
        ? `¡Felicitaciones! Has completado la meta "${goalName}"`
        : `La meta "${goalName}" está al ${percent.toFixed(1)}% ($${currentAmount.toLocaleString(
            'es-CL'
          )} de $${targetAmount.toLocaleString('es-CL')})`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'savingsGoal',
      relatedEntityId: goalId,
      createdAt: new Date(),
    };

    return this.create(alert);
  }

  /**
   * Create a credit limit alert
   */
  async createCreditLimitAlert(
    userId: string,
    creditCardId: string,
    cardName: string,
    usagePercent: number,
    threshold: number
  ): Promise<string> {
    const priority: AlertPriority = usagePercent >= 95 ? 'URGENT' : 'HIGH';

    const alert: Omit<Alert, 'id'> = {
      type: 'CREDIT_LIMIT',
      priority,
      title: 'Límite de crédito cerca del máximo',
      message: `La tarjeta "${cardName}" está al ${usagePercent.toFixed(
        1
      )}% de su límite (umbral: ${threshold}%)`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'creditCard',
      relatedEntityId: creditCardId,
      thresholdPercent: threshold,
      createdAt: new Date(),
    };

    return this.create(alert);
  }
}

/**
 * Alert Settings Service
 * Manages user preferences for alerts
 */
export class AlertSettingsService extends BaseService<AlertSettings> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/alertSettings`);
  }

  /**
   * Get alert settings for a user (create defaults if not exists)
   */
  async getUserSettings(userId: string): Promise<AlertSettings> {
    const existing = await this.getById(userId);

    if (existing) {
      return existing;
    }

    // Create default settings
    const defaults: AlertSettings = {
      id: userId,
      userId,
      enableBudgetAlerts: true,
      budgetThresholdPercent: 80,
      enablePaymentDueAlerts: true,
      paymentDueDaysBefore: 3,
      enableLowBalanceAlerts: true,
      lowBalanceThreshold: 50000, // CLP
      enableUnusualExpenseAlerts: true,
      unusualExpenseMultiplier: 3,
      enableSavingsGoalAlerts: true,
      enableCreditLimitAlerts: true,
      creditLimitThresholdPercent: 90,
    };

    await this.create(defaults);
    return defaults;
  }

  /**
   * Update user alert settings
   */
  async updateSettings(userId: string, settings: Partial<AlertSettings>): Promise<void> {
    await this.update(userId, settings);
  }
}
