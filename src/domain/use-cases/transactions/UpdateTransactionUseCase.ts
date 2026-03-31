import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Transaction as TransactionEntity } from '@/domain/entities/Transaction';
import { TransactionType } from '@/types/firestore';

/**
 * Input for updating a transaction
 */
export interface UpdateTransactionInput {
  transactionId: string;
  amount?: number;
  description?: string;
  date?: Date;
  accountId?: string;
  categoryId?: string;
  tags?: string[];
  receiptUrl?: string;
}

/**
 * Output for transaction update
 */
export interface UpdateTransactionOutput {
  transactionId: string;
  success: boolean;
}

/**
 * Use Case: Update Transaction
 * Handles transaction updates with automatic account balance adjustments
 */
export class UpdateTransactionUseCase extends BaseUseCase<
  UpdateTransactionInput,
  UpdateTransactionOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: UpdateTransactionInput): Promise<UpdateTransactionOutput> {
    // Get original transaction
    const originalTransaction = await this.transactionRepo.getById(input.transactionId);
    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }

    // Verify transaction can be edited (not part of paid installments)
    if (originalTransaction.isInstallment && originalTransaction.installmentNumber !== 1) {
      throw new Error(
        'Cannot edit installment transactions directly. Edit from first installment.'
      );
    }

    // Verify transaction is not from recurring (should be managed from recurring entity)
    if (originalTransaction.isRecurring) {
      throw new Error(
        'Cannot edit recurring transactions directly. Manage from recurring transaction.'
      );
    }

    // Handle account change
    if (input.accountId && input.accountId !== originalTransaction.accountId) {
      await this.handleAccountChange(
        originalTransaction,
        input.accountId,
        input.amount || originalTransaction.amount
      );
    }
    // Handle amount change on same account
    else if (input.amount && input.amount !== originalTransaction.amount) {
      await this.handleAmountChange(originalTransaction, input.amount);
    }

    // Update transaction with new values
    await this.transactionRepo.update(input.transactionId, {
      amount: input.amount,
      description: input.description,
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      tags: input.tags,
      receiptUrl: input.receiptUrl,
    });

    return {
      transactionId: input.transactionId,
      success: true,
    };
  }

  /**
   * Handles account change: revert old account and apply to new account
   */
  private async handleAccountChange(
    originalTransaction: any,
    newAccountId: string,
    newAmount: number
  ): Promise<void> {
    // Get both accounts
    const oldAccount = await this.accountRepo.getById(originalTransaction.accountId);
    const newAccount = await this.accountRepo.getById(newAccountId);

    if (!oldAccount || !newAccount) {
      throw new Error('Account not found');
    }

    // Revert old account balance
    let oldAccountNewBalance = oldAccount.balance;
    if (originalTransaction.type === 'INCOME') {
      oldAccountNewBalance -= originalTransaction.amount;
    } else {
      oldAccountNewBalance += originalTransaction.amount;
    }

    // Apply to new account
    let newAccountNewBalance = newAccount.balance;
    if (originalTransaction.type === 'INCOME') {
      newAccountNewBalance += newAmount;
    } else {
      // Check if new account has sufficient balance (except for credit cards)
      if (newAccount.type !== 'CREDIT_CARD' && newAccount.balance < newAmount) {
        throw new Error('Insufficient balance in destination account');
      }
      newAccountNewBalance -= newAmount;
    }

    // Update both accounts
    await this.accountRepo.updateBalance(oldAccount.id, oldAccountNewBalance);
    await this.accountRepo.updateBalance(newAccount.id, newAccountNewBalance);
  }

  /**
   * Handles amount change on same account
   */
  private async handleAmountChange(originalTransaction: any, newAmount: number): Promise<void> {
    const account = await this.accountRepo.getById(originalTransaction.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate the difference
    const difference = newAmount - originalTransaction.amount;

    let newBalance = account.balance;
    if (originalTransaction.type === 'INCOME') {
      newBalance += difference; // More income = increase balance
    } else {
      // Check if there's sufficient balance for increased expense (except credit cards)
      if (account.type !== 'CREDIT_CARD' && difference > 0) {
        if (account.balance < difference) {
          throw new Error('Insufficient balance for increased expense amount');
        }
      }
      newBalance -= difference; // More expense = decrease balance
    }

    await this.accountRepo.updateBalance(account.id, newBalance);
  }
}
