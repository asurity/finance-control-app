'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Hoy', getValue: () => ({ from: new Date(), to: new Date() }) },
  {
    label: 'Esta semana',
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: 'Este mes',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Mes pasado',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
  {
    label: 'Trimestre',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 2)),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Año',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
];

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });

  const handleSelect = (selected: DateRange | undefined) => {
    setRange(selected);
    if (selected?.from && selected?.to) {
      onRangeChange(selected.from, selected.to);
    }
  };

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    const { from, to } = preset.getValue();
    setRange({ from, to });
    onRangeChange(from, to);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !range && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {range?.from ? (
            range.to ? (
              <>
                {format(range.from, 'dd MMM yyyy', { locale: es })} -{' '}
                {format(range.to, 'dd MMM yyyy', { locale: es })}
              </>
            ) : (
              format(range.from, 'dd MMM yyyy', { locale: es })
            )
          ) : (
            'Seleccionar rango'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Rápido</p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={es}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
