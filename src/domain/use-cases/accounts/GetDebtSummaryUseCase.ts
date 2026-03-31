import { BaseUseCase } from '../base/BaseUseCase';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { AccountType } from '@/types/firestore';

/**
 * Debt Summary Output
 */
export interface DebtSummary {
  totalDebt: number;
  totalAssets: number;
  netWorth: number;
  creditCards: Array<{
    accountId: string;
    accountName: string;
    balance: number;
    creditLimit: number;
    availableCredit: number;
    utilizationPercent: number;
    cutoffDay: number | null;
    paymentDueDay: number | null;
    daysUntilPayment: number | null;
    bankName?: string;
    cardNumber?: string;
  }>;
  linesOfCredit: Array<{
    accountId: string;
    accountName: string;
    balance: number;
    creditLimit: number;
    availableCredit: number;
    utilizationPercent: number;
    bankName?: string;
  }>;
  debitAccounts: Array<{
    accountId: string;
    accountName: string;
    balance: number;
    type: AccountType;
    bankName?: string;
  }>;
}

/**
 * Debt Summary Input
 */
export interface GetDebtSummaryInput {
  orgId: string;
}

/**
 * Use Case: Get Debt Summary
 * Calculates total debt, assets, net worth, and detailed breakdown by account type
 */
export class GetDebtSummaryUseCase extends BaseUseCase<
  GetDebtSummaryInput,
  DebtSummary
> {
  constructor(
    private accountRepo: IAccountRepository,
    private creditCardRepo: ICreditCardRepository
  ) {
    super();
  }

  async execute(input: GetDebtSummaryInput): Promise<DebtSummary> {
    const { orgId } = input;

    // Get all active accounts
    const accounts = await this.accountRepo.getActive();

    // Separate accounts by type
    const creditCardAccounts = accounts.filter(acc => acc.type === 'CREDIT_CARD');
    const lineOfCreditAccounts = accounts.filter(acc => acc.type === 'LINE_OF_CREDIT');
    const debitAccounts = accounts.filter(acc => 
      acc.type === 'CHECKING' || 
      acc.type === 'SAVINGS' || 
      acc.type === 'CASH' || 
      acc.type === 'INVESTMENT'
    );

    // Calculate credit card details
    const creditCards = creditCardAccounts.map(acc => {
      const creditLimit = acc.creditLimit || 0;
      const availableCredit = acc.availableCredit || 0;
      
      // For credit cards: balance is negative (debt), so used credit = |balance|
      const usedCredit = Math.abs(acc.balance);
      const utilizationPercent = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

      // Calculate days until next payment
      let daysUntilPayment: number | null = null;
      if (acc.paymentDueDay) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let paymentDate = new Date(currentYear, currentMonth, acc.paymentDueDay);
        
        // If payment day has passed this month, calculate for next month
        if (paymentDate < today) {
          paymentDate = new Date(currentYear, currentMonth + 1, acc.paymentDueDay);
        }
        
        const diffTime = paymentDate.getTime() - today.getTime();
        daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        accountId: acc.id,
        accountName: acc.name,
        balance: usedCredit, // Return as positive value (amount owed)
        creditLimit,
        availableCredit,
        utilizationPercent,
        cutoffDay: acc.cutoffDay || null,
        paymentDueDay: acc.paymentDueDay || null,
        daysUntilPayment,
        bankName: acc.bankName,
        cardNumber: acc.cardNumber,
      };
    });

    // Calculate line of credit details
    const linesOfCredit = lineOfCreditAccounts.map(acc => {
      const creditLimit = acc.creditLimit || 0;
      const availableCredit = acc.availableCredit || acc.balance || 0;
      
      // For lines of credit: balance is available amount (positive)
      // Used credit = limit - available
      const usedCredit = creditLimit - availableCredit;
      const utilizationPercent = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

      return {
        accountId: acc.id,
        accountName: acc.name,
        balance: usedCredit, // Amount owed
        creditLimit,
        availableCredit,
        utilizationPercent,
        bankName: acc.bankName,
      };
    });

    // Debit accounts (assets)
    const debitAccountsData = debitAccounts.map(acc => ({
      accountId: acc.id,
      accountName: acc.name,
      balance: acc.balance,
      type: acc.type,
      bankName: acc.bankName,
    }));

    // Calculate totals
    const totalDebt = [
      ...creditCards.map(cc => cc.balance),
      ...linesOfCredit.map(loc => loc.balance),
    ].reduce((sum, amount) => sum + amount, 0);

    const totalAssets = debitAccountsData
      .reduce((sum, acc) => sum + acc.balance, 0);

    const netWorth = totalAssets - totalDebt;

    return {
      totalDebt,
      totalAssets,
      netWorth,
      creditCards,
      linesOfCredit,
      debitAccounts: debitAccountsData,
    };
  }
}
