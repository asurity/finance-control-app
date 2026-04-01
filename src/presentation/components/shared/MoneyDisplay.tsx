/**
 * MoneyDisplay Component
 * Centralized money display with consistent colors, signs, and formatting
 * Implements DRY principle for all money displays in the application
 */

import { cn } from '@/lib/utils';
import { formatCurrency, formatCurrencyAbsolute, formatCurrencyWithSign } from '@/lib/utils/format';

export interface MoneyDisplayProps {
  amount: number;
  type: 'income' | 'expense' | 'balance' | 'neutral';
  showSign?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * MoneyDisplay component with consistent color coding:
 * - income: green color, absolute value, optional sign
 * - expense: red color, absolute value, optional sign
 * - balance: green if ≥ 0, red if < 0, always with sign
 * - neutral: default color, value as-is
 */
export function MoneyDisplay({
  amount,
  type,
  showSign = false,
  className,
  size = 'md',
}: MoneyDisplayProps) {
  // Determine formatting based on type
  let formattedAmount: string;
  let colorClass: string;

  // Size classes with responsive scaling
  const sizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl md:text-2xl',
  };

  // Apply rules based on type
  switch (type) {
    case 'income':
      formattedAmount = showSign
        ? amount >= 0
          ? `+${formatCurrencyAbsolute(amount)}`
          : `-${formatCurrencyAbsolute(amount)}`
        : formatCurrencyAbsolute(amount);
      colorClass = 'text-green-600 dark:text-green-400';
      break;

    case 'expense':
      formattedAmount = showSign
        ? amount >= 0
          ? `+${formatCurrencyAbsolute(amount)}`
          : `-${formatCurrencyAbsolute(amount)}`
        : formatCurrencyAbsolute(amount);
      colorClass = 'text-red-600 dark:text-red-400';
      break;

    case 'balance':
      // Balance always shows sign
      formattedAmount = formatCurrencyWithSign(amount);
      colorClass =
        amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
      break;

    case 'neutral':
    default:
      formattedAmount = showSign ? formatCurrencyWithSign(amount) : formatCurrency(amount);
      colorClass = 'text-foreground';
      break;
  }

  return (
    <span className={cn('font-medium', sizeClasses[size], colorClass, className)}>
      {formattedAmount}
    </span>
  );
}
