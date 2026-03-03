/**
 * Use Cases barrel export
 * Exports all use cases organized by module
 */

// Base
export { BaseUseCase } from './base/BaseUseCase';

// Transactions
export { 
  CreateTransactionUseCase,
  type CreateTransactionInput,
  type CreateTransactionOutput 
} from './transactions/CreateTransactionUseCase';

export { 
  DeleteTransactionUseCase,
  type DeleteTransactionInput,
  type DeleteTransactionOutput 
} from './transactions/DeleteTransactionUseCase';

// Accounts
export { 
  TransferBetweenAccountsUseCase,
  type TransferBetweenAccountsInput,
  type TransferBetweenAccountsOutput 
} from './accounts/TransferBetweenAccountsUseCase';

// Budgets
export { 
  CalculateBudgetUsageUseCase,
  type CalculateBudgetUsageInput,
  type CalculateBudgetUsageOutput 
} from './budgets/CalculateBudgetUsageUseCase';

// Credit Cards
export { 
  ProcessCreditCardPaymentUseCase,
  type ProcessCreditCardPaymentInput,
  type ProcessCreditCardPaymentOutput 
} from './credit-cards/ProcessCreditCardPaymentUseCase';

// Recurring Transactions
export { 
  ProcessRecurringTransactionsUseCase,
  type ProcessRecurringTransactionsInput,
  type ProcessRecurringTransactionsOutput 
} from './recurring-transactions/ProcessRecurringTransactionsUseCase';

// Alerts
export { 
  CheckBudgetAlertsUseCase,
  type CheckBudgetAlertsInput,
  type CheckBudgetAlertsOutput 
} from './alerts/CheckBudgetAlertsUseCase';

// Savings Goals
export { 
  ContributeToSavingsGoalUseCase,
  type ContributeToSavingsGoalInput,
  type ContributeToSavingsGoalOutput 
} from './savings-goals/ContributeToSavingsGoalUseCase';

// Categories
export { 
  SeedDefaultCategoriesUseCase,
  type SeedDefaultCategoriesInput,
  type SeedDefaultCategoriesOutput 
} from './categories/SeedDefaultCategoriesUseCase';
