/**
 * Account DTOs
 * Data Transfer Objects for Account operations
 */

import { AccountType } from '@/types/firestore';

/**
 * DTO for creating a new account
 */
export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  userId: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  creditLimit?: number;
  creditCardId?: string;
}

/**
 * DTO for updating an account
 */
export interface UpdateAccountDTO {
  id: string;
  name?: string;
  balance?: number;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

/**
 * DTO for transferring between accounts
 */
export interface TransferBetweenAccountsDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  userId: string;
  date?: Date;
}
