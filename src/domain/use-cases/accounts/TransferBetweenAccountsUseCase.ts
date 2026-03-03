import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';

/**
 * Input for transferring between accounts
 */
export interface TransferBetweenAccountsInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  userId: string;
  date?: Date;
}

/**
 * Output for transfer operation
 */
export interface TransferBetweenAccountsOutput {
  success: boolean;
  fromAccountNewBalance: number;
  toAccountNewBalance: number;
}

/**
 * Use Case: Transfer Between Accounts
 * Handles money transfers between two accounts
 */
export class TransferBetweenAccountsUseCase extends BaseUseCase<
  TransferBetweenAccountsInput,
  TransferBetweenAccountsOutput
> {
  constructor(private accountRepo: IAccountRepository) {
    super();
  }

  async execute(input: TransferBetweenAccountsInput): Promise<TransferBetweenAccountsOutput> {
    // Validate accounts exist
    const fromAccount = await this.accountRepo.getById(input.fromAccountId);
    const toAccount = await this.accountRepo.getById(input.toAccountId);

    if (!fromAccount) {
      throw new Error('Source account not found');
    }

    if (!toAccount) {
      throw new Error('Destination account not found');
    }

    // Check if it's a credit card (different logic)
    if (fromAccount.type !== 'CREDIT_CARD' && fromAccount.balance < input.amount) {
      throw new Error('Insufficient balance in source account');
    }

    // Perform the transfer
    await this.accountRepo.transfer(
      input.fromAccountId,
      input.toAccountId,
      input.amount,
      input.description
    );

    // Get updated balances
    const updatedFromAccount = await this.accountRepo.getById(input.fromAccountId);
    const updatedToAccount = await this.accountRepo.getById(input.toAccountId);

    return {
      success: true,
      fromAccountNewBalance: updatedFromAccount?.balance ?? 0,
      toAccountNewBalance: updatedToAccount?.balance ?? 0,
    };
  }
}
