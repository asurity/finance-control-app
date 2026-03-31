/**
 * Constantes de configuración global de la aplicación
 * Centraliza configuraciones para fácil mantenimiento
 */

/**
 * Configuración principal de la aplicación
 */
export const APP_CONFIG = {
  // Información básica
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Control Financiero',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  description: 'Sistema de control financiero para negocios y finanzas personales',
  version: '0.7.3',

  // Configuración regional
  defaultCurrency: 'CLP',
  defaultLocale: 'es-CL',
  timezone: 'America/Santiago',

  // Paginación
  itemsPerPage: 20,
  maxItemsPerPage: 100,

  // Archivos
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  allowedFileExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],

  // Features flags
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',

  // Límites de datos
  maxTransactionsPerImport: 1000,
  maxCategoriesPerOrg: 50,
  maxAccountsPerOrg: 20,
  maxUsersPerOrg: 10,

  // Configuración de fechas
  dateFormats: {
    short: 'DD/MM/YYYY',
    long: 'DD de MMMM de YYYY',
    time: 'HH:mm',
    dateTime: 'DD/MM/YYYY HH:mm',
  },

  // Configuración de moneda
  currencyFormat: {
    symbol: '$',
    decimals: 0,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
} as const;

/**
 * Rutas de la aplicación
 * Centraliza todas las URLs para fácil mantenimiento
 */
export const ROUTES = {
  // Pública
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',

  // Dashboard y principal
  dashboard: '/dashboard',

  // Transacciones
  transactions: '/transactions',
  transactionsNew: '/transactions/new',
  transactionsEdit: (id: string) => `/transactions/${id}/edit`,
  transactionsView: (id: string) => `/transactions/${id}`,

  // Cuentas
  accounts: '/accounts',
  accountsNew: '/accounts/new',
  accountsEdit: (id: string) => `/accounts/${id}/edit`,
  accountsView: (id: string) => `/accounts/${id}`,

  // Tarjetas de crédito
  creditCards: '/credit-cards',
  creditCardsNew: '/credit-cards/new',
  creditCardsEdit: (id: string) => `/credit-cards/${id}/edit`,
  creditCardsView: (id: string) => `/credit-cards/${id}`,
  creditCardStatements: (id: string) => `/credit-cards/${id}/statements`,

  // Presupuestos
  budgets: '/budgets',
  budgetsNew: '/budgets/new',
  budgetsEdit: (id: string) => `/budgets/${id}/edit`,
  budgetsView: (id: string) => `/budgets/${id}`,

  // Categorías
  categories: '/categories',
  categoriesNew: '/categories/new',
  categoriesEdit: (id: string) => `/categories/${id}/edit`,

  // Reportes
  reports: '/reports',
  reportsIncome: '/reports/income',
  reportsExpenses: '/reports/expenses',
  reportsCashFlow: '/reports/cash-flow',
  reportsBalance: '/reports/balance',
  reportsCustom: '/reports/custom',

  // Metas de ahorro
  savingsGoals: '/savings-goals',
  savingsGoalsNew: '/savings-goals/new',
  savingsGoalsEdit: (id: string) => `/savings-goals/${id}/edit`,
  savingsGoalsView: (id: string) => `/savings-goals/${id}`,

  // Transacciones recurrentes
  recurring: '/recurring',
  recurringNew: '/recurring/new',
  recurringEdit: (id: string) => `/recurring/${id}/edit`,
  recurringView: (id: string) => `/recurring/${id}`,

  // Alertas
  alerts: '/alerts',
  alertsSettings: '/alerts/settings',

  // Configuración
  settings: '/settings',
  settingsProfile: '/settings/profile',
  settingsOrganization: '/settings/organization',
  settingsMembers: '/settings/members',
  settingsSecurity: '/settings/security',
  settingsNotifications: '/settings/notifications',
  settingsPreferences: '/settings/preferences',

  // API routes (para llamadas internas)
  api: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      signup: '/api/auth/signup',
    },
    transactions: '/api/transactions',
    accounts: '/api/accounts',
    categories: '/api/categories',
    budgets: '/api/budgets',
  },
} as const;

/**
 * Tipos de cuenta disponibles
 */
export const ACCOUNT_TYPES = {
  CHECKING: { label: 'Cuenta Corriente', icon: '🏦' },
  SAVINGS: { label: 'Cuenta de Ahorros', icon: '💰' },
  CREDIT_CARD: { label: 'Tarjeta de Crédito', icon: '💳' },
  CASH: { label: 'Efectivo', icon: '💵' },
  INVESTMENT: { label: 'Inversión', icon: '📈' },
} as const;

/**
 * Tipos de transacción
 */
export const TRANSACTION_TYPES = {
  INCOME: { label: 'Ingreso', icon: '💰', color: '#00B894' },
  EXPENSE: { label: 'Gasto', icon: '💸', color: '#FF6B6B' },
  TRANSFER: { label: 'Transferencia', icon: '🔄', color: '#74B9FF' },
} as const;

/**
 * Períodos de presupuesto
 */
export const BUDGET_PERIODS = {
  WEEKLY: { label: 'Semanal', days: 7 },
  BIWEEKLY: { label: 'Quincenal', days: 14 },
  MONTHLY: { label: 'Mensual', days: 30 },
  QUARTERLY: { label: 'Trimestral', days: 90 },
  YEARLY: { label: 'Anual', days: 365 },
} as const;

/**
 * Frecuencias de transacciones recurrentes
 */
export const RECURRING_FREQUENCIES = {
  DAILY: { label: 'Diario', days: 1 },
  WEEKLY: { label: 'Semanal', days: 7 },
  BIWEEKLY: { label: 'Quincenal', days: 14 },
  MONTHLY: { label: 'Mensual', days: 30 },
  QUARTERLY: { label: 'Trimestral', days: 90 },
  YEARLY: { label: 'Anual', days: 365 },
} as const;

/**
 * Tipos de alertas
 */
export const ALERT_TYPES = {
  BUDGET_THRESHOLD: { label: 'Presupuesto excedido', icon: '⚠️', color: '#FF6B6B' },
  PAYMENT_DUE: { label: 'Pago próximo', icon: '📅', color: '#FFA502' },
  LOW_BALANCE: { label: 'Saldo bajo', icon: '💰', color: '#FFD93D' },
  UNUSUAL_EXPENSE: { label: 'Gasto inusual', icon: '🔍', color: '#6C5CE7' },
  SAVINGS_GOAL: { label: 'Meta de ahorro', icon: '🎯', color: '#00B894' },
  CREDIT_LIMIT: { label: 'Límite de crédito', icon: '💳', color: '#FF6B6B' },
  RECURRING_FAILED: { label: 'Recurrente fallida', icon: '❌', color: '#D63031' },
} as const;

/**
 * Prioridades de alertas
 */
export const ALERT_PRIORITIES = {
  LOW: { label: 'Baja', color: '#B2BEC3' },
  MEDIUM: { label: 'Media', color: '#FFA502' },
  HIGH: { label: 'Alta', color: '#FF6B6B' },
  URGENT: { label: 'Urgente', color: '#D63031' },
} as const;

/**
 * Roles de usuario en organización
 */
export const ORGANIZATION_ROLES = {
  OWNER: { label: 'Propietario', permissions: ['all'] },
  ADMIN: { label: 'Administrador', permissions: ['read', 'write', 'delete', 'manage_users'] },
  ACCOUNTANT: { label: 'Contador', permissions: ['read', 'write'] },
  USER: { label: 'Usuario', permissions: ['read', 'write'] },
  VIEWER: { label: 'Visualizador', permissions: ['read'] },
} as const;

/**
 * Estados de metas de ahorro
 */
export const SAVINGS_GOAL_STATUSES = {
  ACTIVE: { label: 'Activa', color: '#00B894' },
  COMPLETED: { label: 'Completada', color: '#6C5CE7' },
  CANCELLED: { label: 'Cancelada', color: '#B2BEC3' },
} as const;

/**
 * Configuración de gráficos
 */
export const CHART_CONFIG = {
  colors: {
    primary: '#221EB3',
    income: '#00B894',
    expense: '#FF6B6B',
    neutral: '#B2BEC3',
    accent: '#6C5CE7',
  },
  defaultHeight: 300,
  animationDuration: 300,
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  GENERIC: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
  NETWORK: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  VALIDATION: 'Por favor, verifica los datos ingresados.',
  DUPLICATE: 'Este registro ya existe.',
} as const;

/**
 * Mensajes de éxito comunes
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  SAVED: 'Guardado exitosamente',
} as const;
