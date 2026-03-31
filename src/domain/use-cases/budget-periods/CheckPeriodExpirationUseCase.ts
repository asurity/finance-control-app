import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

export interface CheckPeriodExpirationInput {
  userId: string;
}

export interface PeriodExpirationStatus {
  hasActivePeriod: boolean;
  activePeriod: BudgetPeriod | null;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  lastExpiredPeriod: BudgetPeriod | null;
  suggestion: 'none' | 'create-first' | 'renew-expiring' | 'create-from-expired';
}

export class CheckPeriodExpirationUseCase extends BaseUseCase<
  CheckPeriodExpirationInput,
  PeriodExpirationStatus
> {
  constructor(private budgetPeriodRepo: IBudgetPeriodRepository) {
    super();
  }

  async execute(input: CheckPeriodExpirationInput): Promise<PeriodExpirationStatus> {
    const allPeriods = await this.budgetPeriodRepo.getByUserId(input.userId);

    // Sort by end date descending
    allPeriods.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    const activePeriods = allPeriods.filter((p) => p.isActive());
    const activePeriod = activePeriods.length > 0 ? activePeriods[0] : null;

    // Get last expired period
    const expiredPeriods = allPeriods.filter((p) => p.hasExpired());
    const lastExpiredPeriod = expiredPeriods.length > 0 ? expiredPeriods[0] : null;

    let isExpiringSoon = false;
    let daysUntilExpiration: number | null = null;
    let suggestion: PeriodExpirationStatus['suggestion'] = 'none';

    if (activePeriod) {
      daysUntilExpiration = activePeriod.getRemainingDays();
      isExpiringSoon = daysUntilExpiration <= 3;
      suggestion = isExpiringSoon ? 'renew-expiring' : 'none';
    } else {
      // No active period
      if (lastExpiredPeriod) {
        suggestion = 'create-from-expired';
      } else {
        suggestion = 'create-first';
      }
    }

    return {
      hasActivePeriod: !!activePeriod,
      activePeriod,
      isExpiringSoon,
      daysUntilExpiration,
      lastExpiredPeriod,
      suggestion,
    };
  }
}
