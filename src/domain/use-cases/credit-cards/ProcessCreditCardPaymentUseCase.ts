import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';

/**
 * Input for processing credit card payment
 */
export interface ProcessCreditCardPaymentInput {
  creditCardId: string;
  amount: number;
  fromAccountId: string;
  userId: string;
  paymentDate?: Date;
}

/**
 * Output for credit card payment
 */
export interface ProcessCreditCardPaymentOutput {
  transactionId: string;
  newCreditCardBalance: number;
  newAccountBalance: number;
}

/**
 * Use Case: Process Credit Card Payment
 * Handles credit card payment from an account
 */
export class ProcessCreditCardPaymentUseCase extends BaseUseCase<
  ProcessCreditCardPaymentInput,
  ProcessCreditCardPaymentOutput
> {
  constructor(
    private creditCardRepo: ICreditCardRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: ProcessCreditCardPaymentInput): Promise<ProcessCreditCardPaymentOutput> {
    // Get credit card
    const creditCard = await this.creditCardRepo.getById(input.creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Get payment account
    const fromAccount = await this.accountRepo.getById(input.fromAccountId);
    if (!fromAccount) {
      throw new Error('Payment account not found');
    }

    // Validate payment account has sufficient balance
    if (fromAccount.balance < input.amount) {
      throw new Error('Insufficient balance in payment account');
    }

    // Process the payment (updates credit card balance)
    const transactionId = await this.creditCardRepo.processPayment(
      input.creditCardId,
      input.amount,
      input.userId
    );

    // Update payment account balance
    const newAccountBalance = fromAccount.balance - input.amount;
    await this.accountRepo.updateBalance(input.fromAccountId, newAccountBalance);

    // Get updated credit card balance
    const updatedCreditCard = await this.creditCardRepo.getById(input.creditCardId);

    return {
      transactionId,
      newCreditCardBalance: updatedCreditCard?.currentBalance ?? 0,
      newAccountBalance,
    };
  }
}
