'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MobileCardField {
  label: string;
  value: ReactNode;
}

export interface MobileCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields: MobileCardField[];
  actions?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * MobileCard — Card base reutilizable para la vista móvil de tablas.
 * Layout: Header (título + badge) → Body (pares clave-valor) → Footer (acciones)
 * Touch targets mínimos de 44px en zona de acciones.
 * Puramente presentacional, no conoce entidades de dominio.
 */
export function MobileCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  className,
  onClick,
}: MobileCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 text-card-foreground shadow-sm',
        onClick && 'cursor-pointer active:bg-muted/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm leading-tight truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {/* Body — pares clave-valor */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {fields.map((field, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-muted-foreground">{field.label}</span>
              <span className="font-medium truncate">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — acciones con touch target mínimo */}
      {actions && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t min-h-[44px]">
          {actions}
        </div>
      )}
    </div>
  );
}
