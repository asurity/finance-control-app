import { BaseUseCase } from '../base/BaseUseCase';
import { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for contributing to a savings goal
 */
export interface ContributeToSavingsGoalInput {
  goalId: string;
  amount: number;
  fromAccountId: string;
  userId: string;
  note?: string;
}

/**
 * Output for savings goal contribution
 */
export interface ContributeToSavingsGoalOutput {
  contributionId: string;
  transactionId: string;
  newGoalAmount: number;
  progressPercent: number;
  isCompleted: boolean;
}

/**
 * Use Case: Contribute to Savings Goal
 * Handles contribution to a savings goal with account deduction
 */
export class ContributeToSavingsGoalUseCase extends BaseUseCase<
  ContributeToSavingsGoalInput,
  ContributeToSavingsGoalOutput
> {
  constructor(
    private savingsGoalRepo: ISavingsGoalRepository,
    private accountRepo: IAccountRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(
    input: ContributeToSavingsGoalInput
  ): Promise<ContributeToSavingsGoalOutput> {
    // Validate savings goal exists
    const goal = await this.savingsGoalRepo.getById(input.goalId);
    if (!goal) {
      throw new Error('Savings goal not found');
    }

    // Validate account exists and has sufficient balance
    const account = await this.accountRepo.getById(input.fromAccountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.balance < input.amount) {
      throw new Error('Insufficient balance in account');
    }

    // Create transaction for the contribution
    const transactionId = await this.transactionRepo.create({
      type: 'EXPENSE',
      amount: input.amount,
      description: input.note ? `Contribución: ${goal.name} - ${input.note}` : `Contribución: ${goal.name}`,
      date: new Date(),
      accountId: input.fromAccountId,
      categoryId: 'SAVINGS', // Should be a predefined category
      userId: input.userId,
      isInstallment: false,
    });

    // Update account balance
    await this.accountRepo.updateBalance(
      input.fromAccountId,
      account.balance - input.amount
    );

    // Add contribution to savings goal
    const contributionId = await this.savingsGoalRepo.addContribution(
      input.goalId,
      input.amount,
      transactionId,
      input.note
    );

    // Get updated goal info
    const updatedGoal = await this.savingsGoalRepo.getById(input.goalId);
    const progressPercent = await this.savingsGoalRepo.getProgressPercent(input.goalId);

    return {
      contributionId,
      transactionId,
      newGoalAmount: updatedGoal?.currentAmount ?? goal.currentAmount + input.amount,
      progressPercent,
      isCompleted: updatedGoal?.status === 'COMPLETED',
    };
  }
}
