/**
 * Índice central de utilidades
 * Re-exporta todas las funciones de utilidad para importación conveniente
 */

// Format utilities
export {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatDecimal,
  formatDateRange,
  formatRelativeDate,
  truncateText,
  capitalize,
  sanitizeFilename,
} from './format';

// Validation utilities
export {
  validateRUT,
  formatRUT,
  cleanRUT,
  validateEmail,
  validatePhone,
  formatPhone,
  validateAmount,
  validateDate,
  validateDateRange,
  validatePassword,
  validatePostalCode,
  validateRequired,
  validatePositiveInteger,
} from './validation';
