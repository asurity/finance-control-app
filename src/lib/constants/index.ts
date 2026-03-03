/**
 * Índice central de constantes
 * Re-exporta todas las constantes para importación conveniente
 */

// Categories constants
export {
  DEFAULT_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  getCategoryIcon,
  getCategoryColor,
} from './categories';

export type { CategoryConstant } from './categories';

// App configuration and constants
export {
  APP_CONFIG,
  ROUTES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  BUDGET_PERIODS,
  RECURRING_FREQUENCIES,
  ALERT_TYPES,
  ALERT_PRIORITIES,
  ORGANIZATION_ROLES,
  SAVINGS_GOAL_STATUSES,
  CHART_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './config';
