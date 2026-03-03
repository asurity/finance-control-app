import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Transaction, TransactionType } from '@/types/firestore';

/**
 * Input DTO for creating a transaction
 */
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  accountId: string;
  categoryId: string;
  userId: string;
  notes?: string;
  tags?: string[];
  creditCardId?: string;
  isInstallment?: boolean;
  installments?: number;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
}

/**
 * Output for transaction creation
 */
export interface CreateTransactionOutput {
  transactionId: string;
  installmentGroupId?: string;
  installmentIds?: string[];
}

/**
 * Use Case: Create Transaction
 * Handles transaction creation with automatic account balance updates
 */
export class CreateTransactionUseCase extends BaseUseCase<
  CreateTransactionInput,
  CreateTransactionOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    // Validate account exists
    const accountExists = await this.accountRepo.exists(input.accountId);
    if (!accountExists) {
      throw new Error('Account not found');
    }

    // Get current account to check balance for expenses
    const account = await this.accountRepo.getById(input.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // For installment transactions, use the installment creation method
    if (input.installments && input.installments > 1) {
      const installmentIds = await this.transactionRepo.createInstallment(
        {
          type: input.type,
          amount: input.amount,
          description: input.description,
          date: input.date,
          accountId: input.accountId,
          categoryId: input.categoryId,
          userId: input.userId,
          tags: input.tags,
          creditCardId: input.creditCardId,
        },
        input.installments
      );

      // Get installment group ID from the created transactions
      const firstTransaction = await this.transactionRepo.getById(installmentIds[0]);
      const installmentGroupId = firstTransaction?.installmentGroupId ?? 'unknown';

      // Update account balance only with the first installment amount
      const firstInstallmentAmount = input.amount / input.installments;
      await this.updateAccountBalance(account.id, firstInstallmentAmount, input.type);

      return {
        transactionId: installmentIds[0],
        installmentGroupId,
        installmentIds,
      };
    }

    // Check balance for expenses (not for credit cards)
    if (input.type === 'EXPENSE' && account.type !== 'CREDIT_CARD') {
      if (account.balance < input.amount) {
        throw new Error('Insufficient balance');
      }
    }

    // Create the transaction
    const transactionData: Omit<Transaction, 'id'> = {
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      userId: input.userId,
      tags: input.tags,
      creditCardId: input.creditCardId,
      isInstallment: false,
    };

    const transactionId = await this.transactionRepo.create(transactionData);

    // Update account balance
    await this.updateAccountBalance(account.id, input.amount, input.type);

    return { transactionId };
  }

  private async updateAccountBalance(
    accountId: string,
    amount: number,
    type: TransactionType
  ): Promise<void> {
    const account = await this.accountRepo.getById(accountId);
    if (!account) return;

    let newBalance = account.balance;

    if (type === 'INCOME') {
      newBalance += amount;
    } else if (type === 'EXPENSE') {
      newBalance -= amount;
    }

    await this.accountRepo.updateBalance(accountId, newBalance);
  }
}
