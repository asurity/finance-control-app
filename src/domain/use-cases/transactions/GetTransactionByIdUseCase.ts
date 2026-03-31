import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Transaction } from '@/types/firestore';

/**
 * Input for getting transaction by ID
 */
export interface GetTransactionByIdInput {
  transactionId: string;
}

/**
 * Output for get transaction by ID
 */
export interface GetTransactionByIdOutput {
  transaction: Transaction | null;
}

/**
 * Use Case: Get Transaction By ID
 * Retrieves a specific transaction by its ID
 */
export class GetTransactionByIdUseCase extends BaseUseCase<
  GetTransactionByIdInput,
  GetTransactionByIdOutput
> {
  constructor(private transactionRepo: ITransactionRepository) {
    super();
  }

  async execute(input: GetTransactionByIdInput): Promise<GetTransactionByIdOutput> {
    if (!input.transactionId || input.transactionId.trim().length === 0) {
      throw new Error('Transaction ID is required');
    }

    const transaction = await this.transactionRepo.getById(input.transactionId);

    return {
      transaction,
    };
  }
}
