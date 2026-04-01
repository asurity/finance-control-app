/**
 * Dependency Injection Container
 * Provides centralized access to repositories and use cases
 */

import {
  FirestoreTransactionRepository,
  FirestoreAccountRepository,
  FirestoreCategoryRepository,
  FirestoreBudgetRepository,
  FirestoreBudgetPeriodRepository,
  FirestoreCategoryBudgetRepository,
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
  SuggestCategoryUseCase,
} from '@/domain/use-cases';

import { UpdateTransactionUseCase } from '@/domain/use-cases/transactions/UpdateTransactionUseCase';
import { GetTransactionByIdUseCase } from '@/domain/use-cases/transactions/GetTransactionByIdUseCase';
import { GetTransactionsByDateRangeUseCase } from '@/domain/use-cases/transactions/GetTransactionsByDateRangeUseCase';
import { GetTransactionsByCategoryUseCase } from '@/domain/use-cases/transactions/GetTransactionsByCategoryUseCase';
import { GetTransactionsByAccountUseCase } from '@/domain/use-cases/transactions/GetTransactionsByAccountUseCase';
import { GetTransactionStatisticsUseCase } from '@/domain/use-cases/transactions/GetTransactionStatisticsUseCase';

import { GetDashboardStatisticsUseCase } from '@/domain/use-cases/dashboard/GetDashboardStatisticsUseCase';
import { GetBalanceHistoryUseCase } from '@/domain/use-cases/dashboard/GetBalanceHistoryUseCase';
import { GetExpensesByCategoryUseCase } from '@/domain/use-cases/dashboard/GetExpensesByCategoryUseCase';
import { GetDailyWeeklyStatsUseCase } from '@/domain/use-cases/dashboard/GetDailyWeeklyStatsUseCase';
import { CalculateFinancialProjectionUseCase } from '@/domain/use-cases/dashboard/CalculateFinancialProjectionUseCase';

// Account Use Cases
import { CreateAccountUseCase } from '@/domain/use-cases/accounts/CreateAccountUseCase';
import { UpdateAccountUseCase } from '@/domain/use-cases/accounts/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '@/domain/use-cases/accounts/DeleteAccountUseCase';
import { GetAccountByIdUseCase } from '@/domain/use-cases/accounts/GetAccountByIdUseCase';
import { GetDebtSummaryUseCase } from '@/domain/use-cases/accounts/GetDebtSummaryUseCase';

// Budget Use Cases
import { CreateBudgetUseCase } from '@/domain/use-cases/budgets/CreateBudgetUseCase';
import { UpdateBudgetUseCase } from '@/domain/use-cases/budgets/UpdateBudgetUseCase';
import { DeleteBudgetUseCase } from '@/domain/use-cases/budgets/DeleteBudgetUseCase';
import { CheckBudgetExceededUseCase } from '@/domain/use-cases/budgets/CheckBudgetExceededUseCase';

// Category Use Cases
import { CreateCategoryUseCase } from '@/domain/use-cases/categories/CreateCategoryUseCase';
import { UpdateCategoryUseCase } from '@/domain/use-cases/categories/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '@/domain/use-cases/categories/DeleteCategoryUseCase';
import { GetCategoriesByTypeUseCase } from '@/domain/use-cases/categories/GetCategoriesByTypeUseCase';

// Credit Card Use Cases
import { CreateCreditCardUseCase } from '@/domain/use-cases/credit-cards/CreateCreditCardUseCase';
import { UpdateCreditCardUseCase } from '@/domain/use-cases/credit-cards/UpdateCreditCardUseCase';
import { DeleteCreditCardUseCase } from '@/domain/use-cases/credit-cards/DeleteCreditCardUseCase';
import { CalculateCreditCardBalanceUseCase } from '@/domain/use-cases/credit-cards/CalculateCreditCardBalanceUseCase';
import { GetUpcomingPaymentsUseCase } from '@/domain/use-cases/credit-cards/GetUpcomingPaymentsUseCase';

// Budget Period Use Cases
import { CreateBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/CreateBudgetPeriodUseCase';
import { UpdateBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/UpdateBudgetPeriodUseCase';
import { DeleteBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/DeleteBudgetPeriodUseCase';
import { GetBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/GetBudgetPeriodUseCase';
import { ListBudgetPeriodsUseCase } from '@/domain/use-cases/budget-periods/ListBudgetPeriodsUseCase';
import { GetCurrentBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/GetCurrentBudgetPeriodUseCase';
import { CloneBudgetPeriodUseCase } from '@/domain/use-cases/budget-periods/CloneBudgetPeriodUseCase';
import { CheckPeriodExpirationUseCase } from '@/domain/use-cases/budget-periods/CheckPeriodExpirationUseCase';
import { SuggestCategoryBudgetsUseCase } from '@/domain/use-cases/budget-periods/SuggestCategoryBudgetsUseCase';

// Category Budget Use Cases
import { SetCategoryBudgetUseCase } from '@/domain/use-cases/category-budgets/SetCategoryBudgetUseCase';
import { UpdateCategoryBudgetPercentageUseCase } from '@/domain/use-cases/category-budgets/UpdateCategoryBudgetPercentageUseCase';
import { DeleteCategoryBudgetUseCase } from '@/domain/use-cases/category-budgets/DeleteCategoryBudgetUseCase';
import { GetCategoryBudgetStatusUseCase } from '@/domain/use-cases/category-budgets/GetCategoryBudgetStatusUseCase';
import { GetBudgetPeriodSummaryUseCase } from '@/domain/use-cases/category-budgets/GetBudgetPeriodSummaryUseCase';
import { ListCategoryBudgetsUseCase } from '@/domain/use-cases/category-budgets/ListCategoryBudgetsUseCase';

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
  private budgetPeriodRepo?: FirestoreBudgetPeriodRepository;
  private categoryBudgetRepo?: FirestoreCategoryBudgetRepository;
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
      this.budgetPeriodRepo = undefined;
      this.categoryBudgetRepo = undefined;
      this.creditCardRepo = undefined;
      this.recurringTransactionRepo = undefined;
      this.alertRepo = undefined;
      this.savingsGoalRepo = undefined;
    }
  }

  getOrgId(): string {
    if (!this.orgId) {
      // Return empty string instead of throwing — hooks may be initialized
      // before orgId is available. Queries are guarded with `enabled: !!orgId`
      // so no Firestore calls will execute with an empty orgId.
      return '';
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
      this.recurringTransactionRepo = new FirestoreRecurringTransactionRepository(this.getOrgId());
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

  getBudgetPeriodRepository(): FirestoreBudgetPeriodRepository {
    if (!this.budgetPeriodRepo) {
      this.budgetPeriodRepo = new FirestoreBudgetPeriodRepository(this.getOrgId());
    }
    return this.budgetPeriodRepo;
  }

  getCategoryBudgetRepository(): FirestoreCategoryBudgetRepository {
    if (!this.categoryBudgetRepo) {
      this.categoryBudgetRepo = new FirestoreCategoryBudgetRepository(this.getOrgId());
    }
    return this.categoryBudgetRepo;
  }

  // ========================================
  // Use Case Getters (with automatic dependency injection)
  // ========================================

  getCreateTransactionUseCase(): CreateTransactionUseCase {
    return new CreateTransactionUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository(),
      this.getBudgetRepository(),
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository(),
      this.getCheckBudgetAlertsUseCase()
    );
  }

  getDeleteTransactionUseCase(): DeleteTransactionUseCase {
    return new DeleteTransactionUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository(),
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository()
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

  getGetDailyWeeklyStatsUseCase(): GetDailyWeeklyStatsUseCase {
    return new GetDailyWeeklyStatsUseCase(
      this.getTransactionRepository(),
      this.getBudgetPeriodRepository()
    );
  }

  getCalculateFinancialProjectionUseCase(): CalculateFinancialProjectionUseCase {
    return new CalculateFinancialProjectionUseCase(
      this.getTransactionRepository(),
      this.getBudgetPeriodRepository()
    );
  }

  // ========================================
  // Transaction Use Cases
  // ========================================

  getUpdateTransactionUseCase(): UpdateTransactionUseCase {
    return new UpdateTransactionUseCase(
      this.getTransactionRepository(),
      this.getAccountRepository()
    );
  }

  getGetTransactionByIdUseCase(): GetTransactionByIdUseCase {
    return new GetTransactionByIdUseCase(this.getTransactionRepository());
  }

  getGetTransactionsByDateRangeUseCase(): GetTransactionsByDateRangeUseCase {
    return new GetTransactionsByDateRangeUseCase(this.getTransactionRepository());
  }

  getGetTransactionsByCategoryUseCase(): GetTransactionsByCategoryUseCase {
    return new GetTransactionsByCategoryUseCase(this.getTransactionRepository());
  }

  getGetTransactionsByAccountUseCase(): GetTransactionsByAccountUseCase {
    return new GetTransactionsByAccountUseCase(this.getTransactionRepository());
  }

  getGetTransactionStatisticsUseCase(): GetTransactionStatisticsUseCase {
    return new GetTransactionStatisticsUseCase(
      this.getTransactionRepository(),
      this.getCategoryRepository()
    );
  }

  // ========================================
  // Account Use Cases
  // ========================================

  getCreateAccountUseCase(): CreateAccountUseCase {
    return new CreateAccountUseCase(this.getAccountRepository());
  }

  getUpdateAccountUseCase(): UpdateAccountUseCase {
    return new UpdateAccountUseCase(this.getAccountRepository());
  }

  getDeleteAccountUseCase(): DeleteAccountUseCase {
    return new DeleteAccountUseCase(this.getAccountRepository(), this.getTransactionRepository());
  }

  getGetAccountByIdUseCase(): GetAccountByIdUseCase {
    return new GetAccountByIdUseCase(this.getAccountRepository());
  }

  getGetDebtSummaryUseCase(): GetDebtSummaryUseCase {
    return new GetDebtSummaryUseCase(this.getAccountRepository(), this.getCreditCardRepository());
  }

  // ========================================
  // Budget Use Cases
  // ========================================

  getCreateBudgetUseCase(): CreateBudgetUseCase {
    return new CreateBudgetUseCase(this.getBudgetRepository());
  }

  getUpdateBudgetUseCase(): UpdateBudgetUseCase {
    return new UpdateBudgetUseCase(this.getBudgetRepository());
  }

  getDeleteBudgetUseCase(): DeleteBudgetUseCase {
    return new DeleteBudgetUseCase(this.getBudgetRepository());
  }

  getCheckBudgetExceededUseCase(): CheckBudgetExceededUseCase {
    return new CheckBudgetExceededUseCase(
      this.getBudgetRepository(),
      this.getTransactionRepository()
    );
  }

  // ========================================
  // Category Use Cases
  // ========================================

  getCreateCategoryUseCase(): CreateCategoryUseCase {
    return new CreateCategoryUseCase(this.getCategoryRepository());
  }

  getUpdateCategoryUseCase(): UpdateCategoryUseCase {
    return new UpdateCategoryUseCase(this.getCategoryRepository());
  }

  getDeleteCategoryUseCase(): DeleteCategoryUseCase {
    return new DeleteCategoryUseCase(this.getCategoryRepository(), this.getTransactionRepository());
  }

  getGetCategoriesByTypeUseCase(): GetCategoriesByTypeUseCase {
    return new GetCategoriesByTypeUseCase(this.getCategoryRepository());
  }

  getSuggestCategoryUseCase(): SuggestCategoryUseCase {
    return new SuggestCategoryUseCase(this.getTransactionRepository());
  }

  // ========================================
  // Credit Card Use Cases
  // ========================================

  getCreateCreditCardUseCase(): CreateCreditCardUseCase {
    return new CreateCreditCardUseCase(this.getCreditCardRepository(), this.getAccountRepository());
  }

  getUpdateCreditCardUseCase(): UpdateCreditCardUseCase {
    return new UpdateCreditCardUseCase(this.getCreditCardRepository());
  }

  getDeleteCreditCardUseCase(): DeleteCreditCardUseCase {
    return new DeleteCreditCardUseCase(
      this.getCreditCardRepository(),
      this.getAccountRepository(),
      this.getTransactionRepository()
    );
  }

  getCalculateCreditCardBalanceUseCase(): CalculateCreditCardBalanceUseCase {
    return new CalculateCreditCardBalanceUseCase(this.getCreditCardRepository());
  }

  getGetUpcomingPaymentsUseCase(): GetUpcomingPaymentsUseCase {
    return new GetUpcomingPaymentsUseCase(this.getCreditCardRepository());
  }

  // ========================================
  // Budget Period Use Cases
  // ========================================

  getCreateBudgetPeriodUseCase(): CreateBudgetPeriodUseCase {
    return new CreateBudgetPeriodUseCase(this.getBudgetPeriodRepository());
  }

  getUpdateBudgetPeriodUseCase(): UpdateBudgetPeriodUseCase {
    return new UpdateBudgetPeriodUseCase(
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository()
    );
  }

  getDeleteBudgetPeriodUseCase(): DeleteBudgetPeriodUseCase {
    return new DeleteBudgetPeriodUseCase(
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository()
    );
  }

  getGetBudgetPeriodUseCase(): GetBudgetPeriodUseCase {
    return new GetBudgetPeriodUseCase(this.getBudgetPeriodRepository());
  }

  getListBudgetPeriodsUseCase(): ListBudgetPeriodsUseCase {
    return new ListBudgetPeriodsUseCase(this.getBudgetPeriodRepository());
  }

  getGetCurrentBudgetPeriodUseCase(): GetCurrentBudgetPeriodUseCase {
    return new GetCurrentBudgetPeriodUseCase(this.getBudgetPeriodRepository());
  }

  getCloneBudgetPeriodUseCase(): CloneBudgetPeriodUseCase {
    return new CloneBudgetPeriodUseCase(
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository()
    );
  }

  getCheckPeriodExpirationUseCase(): CheckPeriodExpirationUseCase {
    return new CheckPeriodExpirationUseCase(this.getBudgetPeriodRepository());
  }

  getSuggestCategoryBudgetsUseCase(): SuggestCategoryBudgetsUseCase {
    return new SuggestCategoryBudgetsUseCase(
      this.getTransactionRepository(),
      this.getCategoryRepository()
    );
  }

  // ========================================
  // Category Budget Use Cases
  // ========================================

  getSetCategoryBudgetUseCase(): SetCategoryBudgetUseCase {
    return new SetCategoryBudgetUseCase(
      this.getCategoryBudgetRepository(),
      this.getBudgetPeriodRepository(),
      this.getCategoryRepository()
    );
  }

  getUpdateCategoryBudgetPercentageUseCase(): UpdateCategoryBudgetPercentageUseCase {
    return new UpdateCategoryBudgetPercentageUseCase(
      this.getCategoryBudgetRepository(),
      this.getBudgetPeriodRepository()
    );
  }

  getDeleteCategoryBudgetUseCase(): DeleteCategoryBudgetUseCase {
    return new DeleteCategoryBudgetUseCase(this.getCategoryBudgetRepository());
  }

  getGetCategoryBudgetStatusUseCase(): GetCategoryBudgetStatusUseCase {
    return new GetCategoryBudgetStatusUseCase(this.getCategoryBudgetRepository());
  }

  getGetBudgetPeriodSummaryUseCase(): GetBudgetPeriodSummaryUseCase {
    return new GetBudgetPeriodSummaryUseCase(
      this.getBudgetPeriodRepository(),
      this.getCategoryBudgetRepository()
    );
  }

  getListCategoryBudgetsUseCase(): ListCategoryBudgetsUseCase {
    return new ListCategoryBudgetsUseCase(this.getCategoryBudgetRepository());
  }
}
