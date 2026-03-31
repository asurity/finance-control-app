import { Category } from '@/types/firestore';

/**
 * Categorías de gastos del sistema (no eliminables)
 * Se crean automáticamente al inicializar una nueva organización
 */
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  {
    name: 'Alimentación',
    type: 'EXPENSE',
    icon: '🍔',
    color: '#FF6B6B',
    isSystem: true,
  },
  {
    name: 'Transporte',
    type: 'EXPENSE',
    icon: '🚗',
    color: '#4ECDC4',
    isSystem: true,
  },
  {
    name: 'Servicios',
    type: 'EXPENSE',
    icon: '💡',
    color: '#FFE66D',
    isSystem: true,
  },
  {
    name: 'Entretenimiento',
    type: 'EXPENSE',
    icon: '🎮',
    color: '#A8E6CF',
    isSystem: true,
  },
  {
    name: 'Salud',
    type: 'EXPENSE',
    icon: '🏥',
    color: '#FF8B94',
    isSystem: true,
  },
  {
    name: 'Educación',
    type: 'EXPENSE',
    icon: '📚',
    color: '#95E1D3',
    isSystem: true,
  },
  {
    name: 'Vivienda',
    type: 'EXPENSE',
    icon: '🏠',
    color: '#F38181',
    isSystem: true,
  },
  {
    name: 'Ropa',
    type: 'EXPENSE',
    icon: '👕',
    color: '#AA96DA',
    isSystem: true,
  },
  {
    name: 'Otros Gastos',
    type: 'EXPENSE',
    icon: '📦',
    color: '#FCBAD3',
    isSystem: true,
  },
];

/**
 * Categorías de ingresos del sistema (no eliminables)
 * Se crean automáticamente al inicializar una nueva organización
 */
export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  {
    name: 'Salario',
    type: 'INCOME',
    icon: '💰',
    color: '#2ECC71',
    isSystem: true,
  },
  {
    name: 'Freelance',
    type: 'INCOME',
    icon: '💻',
    color: '#3498DB',
    isSystem: true,
  },
  {
    name: 'Inversiones',
    type: 'INCOME',
    icon: '📈',
    color: '#9B59B6',
    isSystem: true,
  },
  {
    name: 'Ventas',
    type: 'INCOME',
    icon: '🛒',
    color: '#1ABC9C',
    isSystem: true,
  },
  {
    name: 'Otros Ingresos',
    type: 'INCOME',
    icon: '💵',
    color: '#27AE60',
    isSystem: true,
  },
  {
    name: 'Reembolsos',
    type: 'INCOME',
    icon: '🔄',
    color: '#16A085',
    isSystem: true,
  },
  {
    name: 'Regalos',
    type: 'INCOME',
    icon: '🎁',
    color: '#E74C3C',
    isSystem: true,
  },
  {
    name: 'Bonos',
    type: 'INCOME',
    icon: '🏆',
    color: '#F39C12',
    isSystem: true,
  },
  {
    name: 'Venta de Artículos',
    type: 'INCOME',
    icon: '📱',
    color: '#D35400',
    isSystem: true,
  },
];

/**
 * Todas las categorías predeterminadas del sistema
 */
export const DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
