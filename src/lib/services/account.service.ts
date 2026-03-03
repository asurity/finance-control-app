// Account Service - Enhanced account management with credit card support
// Handles all account operations including balance updates

import { BaseService } from './base.service';
import { Account } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';

export class AccountService extends BaseService<Account> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/accounts`);
  }

  /**
   * Get all active accounts
   */
  async getActive(): Promise<Account[]> {
    return this.query([where('isActive', '==', true), orderBy('name', 'asc')]);
  }

  /**
   * Get accounts by type
   */
  async getByType(type: Account['type']): Promise<Account[]> {
    return this.query([where('type', '==', type), where('isActive', '==', true)]);
  }

  /**
   * Get credit card accounts
   */
  async getCreditCards(): Promise<Account[]> {
    return this.getByType('CREDIT_CARD');
  }

  /**
   * Get checking and savings accounts (liquid accounts)
   */
  async getLiquidAccounts(): Promise<Account[]> {
    const checking = await this.getByType('CHECKING');
    const savings = await this.getByType('SAVINGS');
    return [...checking, ...savings];
  }

  /**
   * Update account balance
   * @param accountId - Account ID
   * @param amount - Amount to add (positive) or subtract (negative)
   */
  async updateBalance(accountId: string, amount: number): Promise<void> {
    const account = await this.getById(accountId);
    if (!account) throw new Error('Account not found');

    const newBalance = account.balance + amount;

    // For credit cards, also update available credit
    const updates: Partial<Account> = {
      balance: newBalance,
    };

    if (account.type === 'CREDIT_CARD' && account.creditLimit) {
      updates.availableCredit = account.creditLimit - newBalance;
    }

    await this.update(accountId, updates);
  }

  /**
   * Get total balance across all active accounts
   */
  async getTotalBalance(): Promise<number> {
    const accounts = await this.getActive();
    return accounts.reduce((sum, account) => {
      // For credit cards, use negative balance (it's debt)
      if (account.type === 'CREDIT_CARD') {
        return sum - account.balance;
      }
      return sum + account.balance;
    }, 0);
  }

  /**
   * Get net worth (assets - liabilities)
   */
  async getNetWorth(): Promise<{ assets: number; liabilities: number; netWorth: number }> {
    const accounts = await this.getActive();

    let assets = 0;
    let liabilities = 0;

    accounts.forEach((account) => {
      if (account.type === 'CREDIT_CARD') {
        liabilities += account.balance;
      } else {
        assets += account.balance;
      }
    });

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
    };
  }

  /**
   * Deactivate an account
   */
  async deactivate(accountId: string): Promise<void> {
    await this.update(accountId, { isActive: false });
  }

  /**
   * Reactivate an account
   */
  async reactivate(accountId: string): Promise<void> {
    await this.update(accountId, { isActive: true });
  }

  /**
   * Check if account has low balance
   */
  async hasLowBalance(accountId: string, threshold: number): Promise<boolean> {
    const account = await this.getById(accountId);
    if (!account) return false;

    // Only check for non-credit card accounts
    if (account.type === 'CREDIT_CARD') return false;

    return account.balance <= threshold;
  }

  /**
   * Get accounts with low balance
   */
  async getAccountsWithLowBalance(threshold: number): Promise<Account[]> {
    const accounts = await this.getActive();
    return accounts.filter(
      (account) => account.type !== 'CREDIT_CARD' && account.balance <= threshold
    );
  }

  /**
   * Transfer between accounts
   */
  async transfer(fromAccountId: string, toAccountId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error('Transfer amount must be positive');

    const fromAccount = await this.getById(fromAccountId);
    const toAccount = await this.getById(toAccountId);

    if (!fromAccount || !toAccount) throw new Error('One or both accounts not found');

    // Check sufficient balance (not applicable for credit cards)
    if (fromAccount.type !== 'CREDIT_CARD' && fromAccount.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Update both accounts
    await this.updateBalance(fromAccountId, -amount);
    await this.updateBalance(toAccountId, amount);
  }
}
