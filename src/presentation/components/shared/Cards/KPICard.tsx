/**
 * KPI Card Component
 * Reusable card for displaying Key Performance Indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from '@/presentation/components/shared/Sparkline';

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  className?: string;
  valueClassName?: string;
  sparklineData?: number[]; // Datos para mini gráfico
}

export function KPICard({
  title,
  value,
  change,
  changeType,
  icon,
  description,
  loading,
  className,
  valueClassName,
  sparklineData,
}: KPICardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-40 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (change === undefined) return null;

    if (changeType === 'positive') {
      return <TrendingUp className="h-4 w-4" />;
    } else if (changeType === 'negative') {
      return <TrendingDown className="h-4 w-4" />;
    } else {
      return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (changeType === 'positive') return 'text-green-600 dark:text-green-400';
    if (changeType === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 py-2.5 sm:px-6 sm:py-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="flex items-end justify-between gap-2">
          <div className={cn('text-base sm:text-xl lg:text-2xl font-bold', valueClassName)}>
            {value}
          </div>
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline
              data={sparklineData}
              width={80}
              height={30}
              trend={
                changeType === 'positive' ? 'up' : changeType === 'negative' ? 'down' : 'stable'
              }
              className="shrink-0"
            />
          )}
        </div>

        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs mt-1',
              getTrendColor()
            )}
          >
            {getTrendIcon()}
            <span className="hidden sm:inline">
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            <span className="hidden sm:inline text-muted-foreground">
              desde el período anterior
            </span>
          </div>
        )}

        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * KPI Card Skeleton for loading states
 */
export function KPICardSkeleton({ className }: { className?: string }) {
  return <KPICard title="" value="" loading className={className} />;
}
