import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for deleting a credit card
 */
export interface DeleteCreditCardInput {
  creditCardId: string;
  force?: boolean; // If true, allows deletion even with existing transactions
}

/**
 * Output for credit card deletion
 */
export interface DeleteCreditCardOutput {
  success: boolean;
  message: string;
}

/**
 * Use Case: Delete Credit Card
 * Deletes a credit card and optionally its linked account
 */
export class DeleteCreditCardUseCase extends BaseUseCase<
  DeleteCreditCardInput,
  DeleteCreditCardOutput
> {
  constructor(
    private creditCardRepo: ICreditCardRepository,
    private accountRepo: IAccountRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: DeleteCreditCardInput): Promise<DeleteCreditCardOutput> {
    // Verify credit card exists
    const creditCard = await this.creditCardRepo.getById(input.creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Check if there are transactions with this credit card
    const transactions = await this.transactionRepo.getAll({
      creditCardId: input.creditCardId,
    });

    if (transactions.length > 0 && !input.force) {
      throw new Error(
        `Cannot delete credit card with ${transactions.length} existing transactions. ` +
          'Use force=true to delete anyway, or delete transactions first.'
      );
    }

    // Warn about outstanding balance
    if (creditCard.currentBalance > 0) {
      console.warn(
        `Deleting credit card "${creditCard.name}" with outstanding balance: ${creditCard.currentBalance}`
      );
    }

    // Delete credit card
    await this.creditCardRepo.delete(input.creditCardId);

    // Note: We don't automatically delete the linked account
    // That should be a separate decision by the user

    return {
      success: true,
      message: `Credit card "${creditCard.name}" deleted successfully`,
    };
  }
}
