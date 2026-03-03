// Savings Goal Service - Track and manage savings goals
// Handles goal creation, contributions, and progress tracking

import { BaseService } from './base.service';
import { SavingsGoal, SavingsGoalContribution, SavingsGoalStatus } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';

export class SavingsGoalService extends BaseService<SavingsGoal> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/savingsGoals`);
  }

  /**
   * Get savings goals by user
   */
  async getByUser(userId: string): Promise<SavingsGoal[]> {
    return this.query([where('userId', '==', userId), orderBy('createdAt', 'desc')]);
  }

  /**
   * Get active savings goals for a user
   */
  async getActive(userId: string): Promise<SavingsGoal[]> {
    return this.query([
      where('userId', '==', userId),
      where('status', '==', 'ACTIVE'),
      orderBy('targetDate', 'asc'),
    ]);
  }

  /**
   * Get completed savings goals
   */
  async getCompleted(userId: string): Promise<SavingsGoal[]> {
    return this.query([
      where('userId', '==', userId),
      where('status', '==', 'COMPLETED'),
      orderBy('completedAt', 'desc'),
    ]);
  }

  /**
   * Get goals linked to specific account
   */
  async getByAccount(accountId: string): Promise<SavingsGoal[]> {
    return this.query([where('linkedAccountId', '==', accountId)]);
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(goal: SavingsGoal): number {
    if (goal.targetAmount === 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  /**
   * Calculate remaining amount to reach goal
   */
  calculateRemaining(goal: SavingsGoal): number {
    return Math.max(goal.targetAmount - goal.currentAmount, 0);
  }

  /**
   * Calculate days until target date
   */
  calculateDaysRemaining(goal: SavingsGoal): number | null {
    if (!goal.targetDate) return null;

    const today = new Date();
    const target = new Date(goal.targetDate);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate suggested monthly contribution
   */
  calculateSuggestedContribution(goal: SavingsGoal): number | null {
    if (!goal.targetDate) return null;

    const daysRemaining = this.calculateDaysRemaining(goal);
    if (!daysRemaining || daysRemaining <= 0) return null;

    const remaining = this.calculateRemaining(goal);
    const monthsRemaining = daysRemaining / 30;

    return Math.ceil(remaining / monthsRemaining);
  }

  /**
   * Add contribution to goal
   */
  async addContribution(
    goalId: string,
    amount: number,
    contributionService: SavingsGoalContributionService
  ): Promise<string> {
    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Savings goal not found');

    // Update goal amount
    const newAmount = goal.currentAmount + amount;
    await this.update(goalId, {
      currentAmount: newAmount,
      updatedAt: new Date(),
    });

    // Create contribution record
    const contribution: Omit<SavingsGoalContribution, 'id'> = {
      savingsGoalId: goalId,
      amount,
      date: new Date(),
    };

    const contributionId = await contributionService.create(contribution);

    // Check if goal is completed
    if (newAmount >= goal.targetAmount && goal.status !== 'COMPLETED') {
      await this.markAsCompleted(goalId);
    }

    return contributionId;
  }

  /**
   * Mark goal as completed
   */
  async markAsCompleted(goalId: string): Promise<void> {
    await this.update(goalId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Cancel a goal
   */
  async cancel(goalId: string): Promise<void> {
    await this.update(goalId, {
      status: 'CANCELLED',
      updatedAt: new Date(),
    });
  }

  /**
   * Reactivate a cancelled goal
   */
  async reactivate(goalId: string): Promise<void> {
    await this.update(goalId, {
      status: 'ACTIVE',
      updatedAt: new Date(),
    });
  }

  /**
   * Get goals expiring soon (within N days)
   */
  async getExpiringSoon(userId: string, daysAhead: number = 30): Promise<SavingsGoal[]> {
    const active = await this.getActive(userId);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return active.filter((goal) => {
      if (!goal.targetDate) return false;
      const targetDate = new Date(goal.targetDate);
      return targetDate >= today && targetDate <= futureDate;
    });
  }

  /**
   * Get total saved amount across all goals
   */
  async getTotalSaved(userId: string): Promise<number> {
    const goals = await this.getByUser(userId);
    return goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  }
}

/**
 * Savings Goal Contribution Service
 * Tracks individual contributions to savings goals
 */
export class SavingsGoalContributionService extends BaseService<SavingsGoalContribution> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/savingsGoalContributions`);
  }

  /**
   * Get contributions for a specific goal
   */
  async getByGoal(savingsGoalId: string): Promise<SavingsGoalContribution[]> {
    return this.query([where('savingsGoalId', '==', savingsGoalId), orderBy('date', 'desc')]);
  }

  /**
   * Get contributions within a date range
   */
  async getByDateRange(
    savingsGoalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SavingsGoalContribution[]> {
    const allContributions = await this.getByGoal(savingsGoalId);
    return allContributions.filter((c) => {
      const date = new Date(c.date);
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Get recent contributions (last N contributions)
   */
  async getRecent(savingsGoalId: string, limit: number = 10): Promise<SavingsGoalContribution[]> {
    const contributions = await this.getByGoal(savingsGoalId);
    return contributions.slice(0, limit);
  }

  /**
   * Calculate total contributions for a goal
   */
  async getTotalContributions(savingsGoalId: string): Promise<number> {
    const contributions = await this.getByGoal(savingsGoalId);
    return contributions.reduce((sum, c) => sum + c.amount, 0);
  }
}
