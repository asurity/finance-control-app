import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Account } from '@/types/firestore';

/**
 * Input for getting an account by ID
 */
export interface GetAccountByIdInput {
  accountId: string;
}

/**
 * Output containing account details
 */
export interface GetAccountByIdOutput {
  account: Account;
}

/**
 * Use Case: Get Account By ID
 * Retrieves a single account by its ID
 */
export class GetAccountByIdUseCase extends BaseUseCase<GetAccountByIdInput, GetAccountByIdOutput> {
  constructor(private accountRepo: IAccountRepository) {
    super();
  }

  async execute(input: GetAccountByIdInput): Promise<GetAccountByIdOutput> {
    if (!input.accountId || input.accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    const account = await this.accountRepo.getById(input.accountId);

    if (!account) {
      throw new Error(`Account with ID "${input.accountId}" not found`);
    }

    return { account };
  }
}
