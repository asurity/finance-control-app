'use client';

import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

export interface ResponsiveChartProps {
  children: ReactNode;
  mobileHeight?: number;
  desktopHeight?: number;
  className?: string;
}

/**
 * ResponsiveChart — Wrapper que ajusta dimensiones de recharts según viewport.
 * - Móvil: usa `mobileHeight` (default 220px)
 * - Desktop: usa `desktopHeight` (default 300px)
 *
 * Encapsula `ResponsiveContainer` de recharts.
 * Los charts hijos se renderizan dentro con 100% width y la altura calculada.
 */
export function ResponsiveChart({
  children,
  mobileHeight = 220,
  desktopHeight = 300,
  className,
}: ResponsiveChartProps) {
  const { isMobile } = useResponsive();
  const height = isMobile ? mobileHeight : desktopHeight;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
