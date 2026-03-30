/**
 * CategoryAllocationTable Component
 * Editable table for assigning percentage allocations to expense categories
 */

import { useState, useMemo } from 'react';
import { Percent, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Category } from '@/types/firestore';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';
import { formatCurrency } from '@/lib/utils/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CategoryAllocationTableProps {
  budgetPeriodId: string;
  totalAmount: number;
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  onSave: (allocations: { categoryId: string; percentage: number }[]) => Promise<void>;
  isLoading?: boolean;
}

export function CategoryAllocationTable({
  budgetPeriodId,
  totalAmount,
  categories,
  categoryBudgets,
  onSave,
  isLoading = false,
}: CategoryAllocationTableProps) {
  // Initialize percentages from existing category budgets
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    categories.forEach((cat) => {
      const existing = categoryBudgets.find((cb) => cb.categoryId === cat.id);
      initial[cat.id] = existing?.percentage || 0;
    });
    return initial;
  });

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((sum, p) => sum + (p || 0), 0);
  }, [percentages]);

  const isValid = totalPercentage <= 100;

  const getCategoryBudgetInfo = (categoryId: string) => {
    const percentage = percentages[categoryId] || 0;
    const allocatedAmount = Math.round((totalAmount * percentage) / 100);
    const existing = categoryBudgets.find((cb) => cb.categoryId === categoryId);
    const spentAmount = existing?.spentAmount || 0;
    const remainingAmount = allocatedAmount - spentAmount;
    const usagePercentage = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0;

    return {
      percentage,
      allocatedAmount,
      spentAmount,
      remainingAmount,
      usagePercentage,
      isExceeded: spentAmount > allocatedAmount,
      isApproachingLimit: usagePercentage >= 80 && usagePercentage < 100,
    };
  };

  const handlePercentageChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    setPercentages((prev) => ({
      ...prev,
      [categoryId]: clampedValue,
    }));
  };

  const handleSave = async () => {
    if (!isValid) return;

    const allocations = categories
      .filter((cat) => percentages[cat.id] > 0)
      .map((cat) => ({
        categoryId: cat.id,
        percentage: percentages[cat.id],
      }));

    await onSave(allocations);
  };

  const getStatusBadge = (info: ReturnType<typeof getCategoryBudgetInfo>) => {
    if (info.isExceeded) {
      return <Badge variant="destructive">Excedido</Badge>;
    }
    if (info.isApproachingLimit) {
      return <Badge variant="default" className="bg-yellow-500">Cerca del límite</Badge>;
    }
    if (info.spentAmount > 0) {
      return <Badge variant="secondary">En progreso</Badge>;
    }
    return <Badge variant="outline">Sin uso</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Progress bar del total asignado */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Porcentaje total asignado</span>
          <span className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            {totalPercentage.toFixed(1)}% / 100%
          </span>
        </div>
        <Progress 
          value={Math.min(totalPercentage, 100)} 
          className={!isValid ? 'bg-red-100' : undefined}
        />
        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El total de porcentajes no puede superar 100%
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabla de categorías */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">% Asignado</TableHead>
              <TableHead className="text-right">Monto Calculado</TableHead>
              <TableHead className="text-right">Gastado</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const info = getCategoryBudgetInfo(category.id);
              return (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={info.percentage || ''}
                        onChange={(e) => handlePercentageChange(category.id, e.target.value)}
                        className="w-20 text-right"
                        disabled={isLoading}
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(info.allocatedAmount)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(info.spentAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={info.remainingAmount < 0 ? 'text-red-600 font-semibold' : ''}>
                      {formatCurrency(Math.abs(info.remainingAmount))}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      {getStatusBadge(info)}
                      {info.allocatedAmount > 0 && (
                        <Progress 
                          value={Math.min(info.usagePercentage, 100)} 
                          className="h-1"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isValid || isLoading}
          size="lg"
        >
          {isLoading ? 'Guardando...' : 'Guardar Asignaciones'}
        </Button>
      </div>
    </div>
  );
}
