// Firestore TypeScript Types
// Based on docs/arquitectura.md schema

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationType = 'PERSONAL' | 'BUSINESS';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  ownerId: string;
  createdAt: Date;
}

export type MemberRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'USER' | 'VIEWER';

export interface OrganizationMember {
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'LINE_OF_CREDIT';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  // Bank information
  bankName?: string; // Nombre del banco (ej: Banco Estado, BCI, Santander)
  cardNumber?: string; // Últimos 4 dígitos de la tarjeta (por seguridad)
  // Credit card/Line of credit specific fields (when type is CREDIT_CARD or LINE_OF_CREDIT)
  creditCardId?: string; // Reference to CreditCard document
  creditLimit?: number;
  availableCredit?: number;
  cutoffDay?: number; // Día de corte (1-31)
  paymentDueDay?: number; // Día de pago (1-31)
}

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isSystem?: boolean; // System categories cannot be deleted
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: Date;
  accountId: string;
  categoryId: string;
  userId: string;
  tags?: string[];
  receiptUrl?: string;
  // Installments/Cuotas support
  isInstallment?: boolean;
  installmentNumber?: number; // Current installment (e.g., 1 of 12)
  totalInstallments?: number; // Total number of installments
  installmentGroupId?: string; // Groups all installments together
  // Recurring transaction support
  isRecurring?: boolean;
  recurringTransactionId?: string; // Reference to RecurringTransaction
  // Credit card specific
  creditCardId?: string; // If paid with credit card
}

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number; // Amount spent so far
  period: BudgetPeriod;
  categoryId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  alertThreshold: number; // Percentage (0-100) for alerts
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// ENHANCED TYPES FOR CREDIT CARD MANAGEMENT
// ========================================

export interface CreditCard {
  id: string;
  name: string;
  accountId: string; // Associated account
  bank: string;
  lastFourDigits: string;
  creditLimit: number;
  availableCredit: number;
  currentBalance: number;
  cutoffDay: number; // Día de corte (1-31)
  paymentDueDay: number; // Día de pago (1-31)
  interestRate: number; // Annual interest rate percentage
  minimumPaymentPercent: number; // Minimum payment as percentage of balance
  currency: string; // Default: 'CLP'
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardStatement {
  id: string;
  creditCardId: string;
  statementDate: Date;
  dueDate: Date;
  previousBalance: number;
  payments: number;
  purchases: number;
  interest: number;
  currentBalance: number;
  minimumPayment: number;
  isPaid: boolean;
  paidDate?: Date;
  paidAmount?: number;
}

// ========================================
// RECURRING TRANSACTIONS
// ========================================

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  accountId: string;
  categoryId: string;
  userId: string;
  startDate: Date;
  endDate?: Date; // Optional, if null it's indefinite
  nextOccurrence: Date;
  lastProcessedDate?: Date;
  isActive: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// ALERTS SYSTEM
// ========================================

export type AlertType = 
  | 'BUDGET_THRESHOLD' // Budget limit approaching/exceeded
  | 'PAYMENT_DUE' // Payment due date approaching
  | 'LOW_BALANCE' // Account balance low
  | 'UNUSUAL_EXPENSE' // Unusually high expense detected
  | 'SAVINGS_GOAL' // Savings goal reached/milestone
  | 'CREDIT_LIMIT' // Credit card limit approaching
  | 'RECURRING_FAILED'; // Recurring transaction failed

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  userId: string;
  // References to related entities
  relatedEntityType?: 'budget' | 'account' | 'transaction' | 'creditCard' | 'savingsGoal';
  relatedEntityId?: string;
  // Threshold configuration (for budget/balance alerts)
  thresholdPercent?: number; // e.g., 80 means alert at 80% of budget
  // Date information
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
}

export interface AlertSettings {
  id: string;
  userId: string;
  enableBudgetAlerts: boolean;
  budgetThresholdPercent: number; // Default: 80
  enablePaymentDueAlerts: boolean;
  paymentDueDaysBefore: number; // Default: 3
  enableLowBalanceAlerts: boolean;
  lowBalanceThreshold: number; // Amount in CLP
  enableUnusualExpenseAlerts: boolean;
  unusualExpenseMultiplier: number; // Default: 3x average
  enableSavingsGoalAlerts: boolean;
  enableCreditLimitAlerts: boolean;
  creditLimitThresholdPercent: number; // Default: 90
}

// ========================================
// SAVINGS GOALS
// ========================================

export type SavingsGoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string; // Default: 'CLP'
  targetDate?: Date;
  status: SavingsGoalStatus;
  icon?: string;
  color?: string;
  linkedAccountId?: string; // Optional: track from specific account
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SavingsGoalContribution {
  id: string;
  savingsGoalId: string;
  amount: number;
  date: Date;
  transactionId?: string; // Link to actual transaction if applicable
  note?: string;
}
