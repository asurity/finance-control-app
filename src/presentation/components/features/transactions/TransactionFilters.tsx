/**
 * Transaction Filters Component
 * Comprehensive filtering UI for transactions page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransactionFilterState, DateRangePreset } from '@/types/filters';

interface Account {
  id: string;
  name: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'INCOME' | 'EXPENSE';
}

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  onFiltersChange: (filters: TransactionFilterState) => void;
  initialFilters: TransactionFilterState;
}

export function TransactionFilters({
  accounts,
  categories,
  onFiltersChange,
  initialFilters,
}: TransactionFiltersProps) {
  const [filters, setFilters] = useState<TransactionFilterState>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Apply date range preset
  const applyDatePreset = (preset: DateRangePreset) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'last3Months':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      default:
        return;
    }

    updateFilters({ dateRange: { startDate, endDate } });
  };

  const updateFilters = (partial: Partial<TransactionFilterState>) => {
    const newFilters = { ...filters, ...partial };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: TransactionFilterState = {
      dateRange: { startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) },
      type: 'ALL',
      categoryId: null,
      accountId: null,
      searchText: '',
      minAmount: null,
      maxAmount: null,
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  // Filter categories by transaction type
  const filteredCategories = categories.filter(cat => 
    filters.type === 'ALL' || cat.type === filters.type
  );

  const activeFiltersCount = [
    filters.type !== 'ALL',
    filters.categoryId !== null,
    filters.accountId !== null,
    filters.searchText !== '',
    filters.minAmount !== null,
    filters.maxAmount !== null,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Primary Filters - Always Visible */}
        <div className="space-y-4">
          {/* Date Range Presets */}
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('today')}
              >
                Hoy
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('week')}
              >
                Esta semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('month')}
              >
                Este mes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('lastMonth')}
              >
                Mes pasado
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('last3Months')}
              >
                Últimos 3 meses
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Desde</Label>
              <Input
                id="startDate"
                type="date"
                value={format(filters.dateRange.startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    updateFilters({
                      dateRange: { ...filters.dateRange, startDate: startOfDay(newDate) }
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Hasta</Label>
              <Input
                id="endDate"
                type="date"
                value={format(filters.dateRange.endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    updateFilters({
                      dateRange: { ...filters.dateRange, endDate: endOfDay(newDate) }
                    });
                  }
                }}
              />
            </div>
          </div>

          {/* Type, Category, Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(value: 'ALL' | 'INCOME' | 'EXPENSE') => updateFilters({ type: value, categoryId: null })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INCOME">Ingresos</SelectItem>
                  <SelectItem value="EXPENSE">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={filters.categoryId || 'ALL'}
                onValueChange={(value) => updateFilters({ categoryId: value === 'ALL' ? null : value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Cuenta</Label>
              <Select
                value={filters.accountId || 'ALL'}
                onValueChange={(value) => updateFilters({ accountId: value === 'ALL' ? null : value })}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {accounts.filter(acc => acc.isActive).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground py-2"
            >
              <span>Filtros avanzados</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Monto mínimo</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="$0"
                    value={filters.minAmount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      updateFilters({ minAmount: value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Monto máximo</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="$999999"
                    value={filters.maxAmount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      updateFilters({ maxAmount: value });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar filtros
            </Button>
            {activeFiltersCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
