/**
 * BudgetPeriodSelector Component
 * Dropdown/list for selecting budget periods with visual status indicators
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check } from 'lucide-react';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BudgetPeriodSelectorProps {
  periods: BudgetPeriod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function BudgetPeriodSelector({
  periods,
  selectedId,
  onSelect,
  className,
}: BudgetPeriodSelectorProps) {
  const getStatusBadge = (period: BudgetPeriod) => {
    if (period.isActive()) {
      return <Badge variant="default" className="ml-2">Activo</Badge>;
    }
    if (period.isUpcoming()) {
      return <Badge variant="secondary" className="ml-2">Próximo</Badge>;
    }
    if (period.hasExpired()) {
      return <Badge variant="outline" className="ml-2">Expirado</Badge>;
    }
    return null;
  };

  const formatPeriodLabel = (period: BudgetPeriod) => {
    const start = format(period.startDate, 'dd/MM/yyyy', { locale: es });
    const end = format(period.endDate, 'dd/MM/yyyy', { locale: es });
    return period.name 
      ? `${period.name} (${start} - ${end})` 
      : `${start} - ${end}`;
  };

  if (periods.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Calendar className="h-4 w-4" />
        <span>No hay períodos de presupuesto</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedId || undefined} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar período de presupuesto" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              <div className="flex items-center justify-between w-full">
                <span>{formatPeriodLabel(period)}</span>
                {getStatusBadge(period)}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
