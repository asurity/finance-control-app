/**
 * Constantes de categorías por defecto para la aplicación
 * Estas categorías coinciden con las que se crean en CategoryService.seedDefaultCategories()
 */

export interface CategoryConstant {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
}

/**
 * Lista de 25 categorías por defecto (5 ingresos + 20 gastos)
 * Organizadas por tipo y propósito
 */
export const DEFAULT_CATEGORIES: readonly CategoryConstant[] = [
  // Income categories (5)
  { name: 'Salario', type: 'INCOME', icon: '💰', color: '#00B894' },
  { name: 'Inversiones', type: 'INCOME', icon: '📈', color: '#6C5CE7' },
  { name: 'Ventas', type: 'INCOME', icon: '💵', color: '#00B894' },
  { name: 'Bonos', type: 'INCOME', icon: '🎁', color: '#00B894' },
  { name: 'Otros ingresos', type: 'INCOME', icon: '💸', color: '#00B894' },

  // Expense categories - Household (3)
  { name: 'Alimentación', type: 'EXPENSE', icon: '🍔', color: '#FF6B6B' },
  { name: 'Vivienda', type: 'EXPENSE', icon: '🏠', color: '#96CEB4' },
  { name: 'Servicios básicos', type: 'EXPENSE', icon: '💡', color: '#74B9FF' },

  // Expense categories - Transportation (2)
  { name: 'Transporte', type: 'EXPENSE', icon: '🚗', color: '#4ECDC4' },
  { name: 'Combustible', type: 'EXPENSE', icon: '⛽', color: '#FD79A8' },

  // Expense categories - Personal (4)
  { name: 'Salud', type: 'EXPENSE', icon: '💊', color: '#45B7D1' },
  { name: 'Educación', type: 'EXPENSE', icon: '🎓', color: '#DFE6E9' },
  { name: 'Entretenimiento', type: 'EXPENSE', icon: '🎬', color: '#FFEAA7' },
  { name: 'Ropa', type: 'EXPENSE', icon: '👕', color: '#A29BFE' },

  // Expense categories - Business (3)
  { name: 'Gastos de negocio', type: 'EXPENSE', icon: '💼', color: '#636E72' },
  { name: 'Marketing', type: 'EXPENSE', icon: '📢', color: '#55EFC4' },
  { name: 'Equipamiento', type: 'EXPENSE', icon: '🖥️', color: '#81ECEC' },

  // Expense categories - Financial (4)
  { name: 'Ahorros', type: 'EXPENSE', icon: '🏦', color: '#FAB1A0' },
  { name: 'Inversiones', type: 'EXPENSE', icon: '📊', color: '#6C5CE7' },
  { name: 'Seguros', type: 'EXPENSE', icon: '🛡️', color: '#B2BEC3' },
  { name: 'Impuestos', type: 'EXPENSE', icon: '📝', color: '#2D3436' },

  // Expense categories - Others (4)
  { name: 'Regalos', type: 'EXPENSE', icon: '🎁', color: '#FD79A8' },
  { name: 'Mascotas', type: 'EXPENSE', icon: '🐕', color: '#FDCB6E' },
  { name: 'Otros gastos', type: 'EXPENSE', icon: '❓', color: '#B2BEC3' },
] as const;

/**
 * Obtener categorías de ingresos
 */
export const INCOME_CATEGORIES = DEFAULT_CATEGORIES.filter((cat) => cat.type === 'INCOME');

/**
 * Obtener categorías de gastos
 */
export const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter((cat) => cat.type === 'EXPENSE');

/**
 * Mapeo de nombres de categorías a íconos
 */
export const CATEGORY_ICONS: Record<string, string> = DEFAULT_CATEGORIES.reduce(
  (acc, cat) => ({
    ...acc,
    [cat.name.toLowerCase()]: cat.icon,
  }),
  {}
);

/**
 * Mapeo de nombres de categorías a colores
 */
export const CATEGORY_COLORS: Record<string, string> = DEFAULT_CATEGORIES.reduce(
  (acc, cat) => ({
    ...acc,
    [cat.name.toLowerCase()]: cat.color,
  }),
  {}
);

/**
 * Obtener ícono de una categoría por nombre
 * @param categoryName - Nombre de la categoría
 * @returns Ícono correspondiente o un ícono por defecto
 */
export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_ICONS[categoryName.toLowerCase()] || '📊';
}

/**
 * Obtener color de una categoría por nombre
 * @param categoryName - Nombre de la categoría
 * @returns Color correspondiente o un color por defecto
 */
export function getCategoryColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName.toLowerCase()] || '#B2BEC3';
}
