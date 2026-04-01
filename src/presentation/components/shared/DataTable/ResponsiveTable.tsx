'use client';

import { type ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Definición de columna para la vista tabla (desktop/tablet).
 */
export interface ColumnDef<T> {
  header: ReactNode;
  accessor: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  mobileCard: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  emptyState?: ReactNode;
  className?: string;
  tableClassName?: string;
}

/**
 * ResponsiveTable — Componente genérico tipado que renderiza:
 * - Móvil (< sm): Vista card/list usando la render function `mobileCard`
 * - Tablet+/Desktop (≥ sm): Tabla estándar con las `columns` definidas
 *
 * Desacoplado: recibe datos genéricos <T>, no conoce entidades de dominio.
 * Reutilizable: cualquier página puede usarlo con su propia configuración.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  mobileCard,
  keyExtractor,
  emptyMessage = 'No hay datos para mostrar',
  emptyState,
  className,
  tableClassName,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useResponsive();

  if (data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: card list
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <div key={keyExtractor(item)}>
            {mobileCard(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop/Tablet: standard table
  return (
    <div className={cn('relative', className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((col, colIdx) => (
              <TableHead key={colIdx} className={col.headerClassName ?? col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={keyExtractor(item)}>
              {columns.map((col, colIdx) => (
                <TableCell key={colIdx} className={col.className}>
                  {col.accessor(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
