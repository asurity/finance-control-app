/**
 * Dependency Injection Container
 * Provides centralized access to repositories and use cases
 */

import {
  FirestoreTransactionRepository,
  FirestoreAccountRepository,
  FirestoreCategoryRepository,
  FirestoreBudgetRepository,
  FirestoreCreditCardRepository,
  FirestoreRecurringTransactionRepository,
  FirestoreAlertRepository,
  FirestoreSavingsGoalRepository,
} from '@/infrastructure/repositories';

import {
  CreateTransactionUseCase,
  DeleteTransactionUseCase,
  TransferBetweenAccountsUseCase,
  CalculateBudgetUsageUseCase,
  ProcessCreditCardPaymentUseCase,
  ProcessRecurringTransactionsUseCase,
  CheckBudgetAlertsUseCase,
  ContributeToSavingsGoalUseCase,
  SeedDefaultCategoriesUseCase,
} from '@/domain/use-cases';

import { GetDashboardStatisticsUseCase } from '@/domain/use-cases/dashboard/GetDashboardStatisticsUseCase';
import { GetBalanceHistoryUseCase } from '@/domain/use-cases/dashboard/GetBalanceHistoryUseCase';
import { GetExpensesByCategoryUseCase } from '@/domain/use-cases/dashboard/GetExpensesByCategoryUseCase';

/**
 * Singleton DI Container
 */
export class DIContainer {
  private static instance: DIContainer;
  private orgId: string = '';

  // Repositories
  private transactionRepo?: FirestoreTransactionRepository;
  private accountRepo?: FirestoreAccountRepository;
  private categoryRepo?: FirestoreCategoryRepository;
  private budgetRepo?: FirestoreBudgetRepository;
  private creditCardRepo?: FirestoreCreditCardRepository;
  private recurringTransactionRepo?: FirestoreRecurringTransactionRepository;
  private alertRepo?: FirestoreAlertRepository;
  private savingsGoalRepo?: FirestoreSavingsGoalRepository;

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Sets the organization ID (must be called before using repositories/use cases)
   */
  setOrgId(orgId: string): void {
    if (this.orgId !== orgId) {
      this.orgId = orgId;
      // Clear cached repositories to force new instances with new orgId
      this.transactionRepo = undefined;
      this.accountRepo = undefined;
      this.categoryRepo = undefined;
      this.budgetRepo = undefined;
      this.creditCardRepo = undefined;
      this.recurringTransactionRepo = undefined;
      this.alertRepo = undefined;
      this.savingsGoalRepo = undefined;
    }
  }

  getOrgId(): string {
    if (!this.orgId) {
      throw new Error('Organization ID not set. Call setOrgId() first.');
    }
    return this.orgId;
  }

  // ========================================
  // Repository Getters
  // ========================================

  getTransactionRepository(): FirestoreTransactionRepository {
    if (!this.transactionRepo) {
      this.transactionRepo = new FirestoreTransactionRepository(this.getOrgId());
    }
    return this.transactionRepo;
  }

  getAccountRepository(): FirestoreAccountRepository {
    if (!this.accountRepo) {
      this.accountRepo = new FirestoreAccountRepository(this.getOrgId());
    }
    return this.accountRepo;
  }

  getCategoryRepository(): FirestoreCategoryRepository {
    if (!this.categoryRepo) {
      this.categoryRepo = new FirestoreCategoryRepository(this.getOrgId());
    }
    return this.categoryRepo;
  }

  getBudgetRepository(): FirestoreBudgetRepository {
    if (!this.budgetRepo) {
      this.budgetRepo = new FirestoreBudgetRepository(this.getOrgId());
    }
    return this.budgetRepo;
  }

  getCreditCardRepository(): FirestoreCreditCardRepository {
    if (!this.creditCardRepo) {
      this.creditCardRepo = new FirestoreCreditCardRepository(this.getOrgId());
    }
    return this.creditCardRepo;
  }

  getRecurringTransactionRepository(): FirestoreRecurringTransactionRepository {
    if (!this.recurringTransactionRepo) {
      this.recurringTransactionRepo = new FirestoreRecurringTransactionRepository(
        this.getOrgId()
      );
    }
    return this.recurringTransactionRepo;
  }

  getAlertRepository(): FirestoreAlertRepository {
    if (!this.alertRepo) {
      this.alertRepo = new FirestoreAlertRepository(this.getOrgId());
    }
    return this.alertRepo;
  }

  getSavingsGoalRepository(): FirestoreSavingsGoalRepository {
    if (!this.savingsGoalRepo) {
      this.savingsGoalRepo = new FirestoreSavingsGoalRepository(this.getOrgId());
    }
    return this.savingsGoalRepo;
  }

  // ========================================
  // Use Case Getters (with automatic dependency injection)
  // ========================================

  getCreateTransactionUseCase(): CreateTransactionUseCase {
    return new CreateTransactionUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository()
    );
  }

  getDeleteTransactionUseCase(): DeleteTransactionUseCase {
    return new DeleteTransactionUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository()
    );
  }

  getTransferBetweenAccountsUseCase(): TransferBetweenAccountsUseCase {
    return new TransferBetweenAccountsUseCase(this.getAccountRepository());
  }

  getCalculateBudgetUsageUseCase(): CalculateBudgetUsageUseCase {
    return new CalculateBudgetUsageUseCase(
      this.getBudgetRepository(),
      this.getTransactionRepository()
    );
  }

  getProcessCreditCardPaymentUseCase(): ProcessCreditCardPaymentUseCase {
    return new ProcessCreditCardPaymentUseCase(
      this.getCreditCardRepository(),
      this.getAccountRepository()
    );
  }

  getProcessRecurringTransactionsUseCase(): ProcessRecurringTransactionsUseCase {
    return new ProcessRecurringTransactionsUseCase(
      this.getRecurringTransactionRepository(),
      this.getTransactionRepository(),
      this.getAccountRepository()
    );
  }

  getCheckBudgetAlertsUseCase(): CheckBudgetAlertsUseCase {
    return new CheckBudgetAlertsUseCase(
      this.getAlertRepository(),
      this.getBudgetRepository(),
      this.getTransactionRepository()
    );
  }

  getContributeToSavingsGoalUseCase(): ContributeToSavingsGoalUseCase {
    return new ContributeToSavingsGoalUseCase(
      this.getSavingsGoalRepository(),
      this.getAccountRepository(),
      this.getTransactionRepository()
    );
  }

  getSeedDefaultCategoriesUseCase(): SeedDefaultCategoriesUseCase {
    return new SeedDefaultCategoriesUseCase(this.getCategoryRepository());
  }

  getGetDashboardStatisticsUseCase(): GetDashboardStatisticsUseCase {
    return new GetDashboardStatisticsUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository(),
      this.getBudgetRepository(),
      this.getAlertRepository()
    );
  }

  getGetBalanceHistoryUseCase(): GetBalanceHistoryUseCase {
    return new GetBalanceHistoryUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository()
    );
  }

  getGetExpensesByCategoryUseCase(): GetExpensesByCategoryUseCase {
    return new GetExpensesByCategoryUseCase(
      this.getTransactionRepository(),
      this.getCategoryRepository()
    );
  }
}
