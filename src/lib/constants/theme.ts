/**
 * Constantes de tema y colores para la aplicación financiera
 */

export const COLORS = {
  income: 'hsl(var(--income))',
  incomeLight: 'hsl(var(--income) / 0.1)',
  expense: 'hsl(var(--expense))',
  expenseLight: 'hsl(var(--expense) / 0.1)',
  neutral: 'hsl(var(--neutral))',
  neutralLight: 'hsl(var(--neutral) / 0.1)',
} as const;

/**
 * Iconos predefinidos para categorías
 */
export const CATEGORY_ICONS = {
  // Gastos
  alimentacion: '🍔',
  supermercado: '🛒',
  restaurante: '🍽️',
  transporte: '🚗',
  combustible: '⛽',
  taxi: '🚕',
  salud: '💊',
  medico: '👨‍⚕️',
  farmacia: '💉',
  vivienda: '🏠',
  arriendo: '🏡',
  servicios: '💡',
  entretenimiento: '🎬',
  streaming: '📺',
  deportes: '⚽',
  educacion: '🎓',
  libros: '📚',
  cursos: '💻',
  compras: '🛍️',
  ropa: '👕',
  tecnologia: '📱',
  mascotas: '🐕',
  belleza: '💄',
  otros: '📦',
  
  // Ingresos
  salario: '💰',
  freelance: '💼',
  inversiones: '📈',
  dividendos: '📊',
  ventas: '🏪',
  regalo: '🎁',
  reembolso: '🔄',
  intereses: '🏦',
} as const;

/**
 * Colores predefinidos para categorías (compatibles con Tailwind)
 */
export const CATEGORY_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
} as const;

/**
 * Tipos de cuenta predefinidos
 */
export const ACCOUNT_TYPES = {
  CHECKING: {
    label: 'Cuenta Corriente',
    icon: '🏦',
    color: CATEGORY_COLORS.blue,
  },
  SAVINGS: {
    label: 'Cuenta de Ahorro',
    icon: '💰',
    color: CATEGORY_COLORS.green,
  },
  CREDIT_CARD: {
    label: 'Tarjeta de Crédito',
    icon: '💳',
    color: CATEGORY_COLORS.purple,
  },
  CASH: {
    label: 'Efectivo',
    icon: '💵',
    color: CATEGORY_COLORS.emerald,
  },
  INVESTMENT: {
    label: 'Inversión',
    icon: '📈',
    color: CATEGORY_COLORS.indigo,
  },
} as const;

/**
 * Configuración de gráficos
 */
export const CHART_CONFIG = {
  colors: {
    primary: 'hsl(var(--chart-1))',
    secondary: 'hsl(var(--chart-2))',
    tertiary: 'hsl(var(--chart-3))',
    quaternary: 'hsl(var(--chart-4))',
    quinary: 'hsl(var(--chart-5))',
  },
  defaultOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  },
} as const;
