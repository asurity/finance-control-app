/**
 * CategoryAllocationTable Component
 * Editable table for assigning percentage allocations to expense categories
 * Supports hierarchical categories with expandable parent/sub-category tree
 */

import { useState, useMemo, Fragment } from 'react';
import { Percent, AlertCircle, CheckCircle2, Edit2, Trash2, ChevronRight, ChevronDown, Sparkles, Info } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CategoryAllocationTableProps {
  budgetPeriodId: string;
  totalAmount: number;
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  onSave: (allocations: { categoryId: string; percentage: number }[]) => Promise<void>;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (category: Category) => void;
  isLoading?: boolean;
  suggestions?: { categoryId: string; suggestedPercentage: number; historicalAmount: number }[];
  canWrite?: boolean;
  canDelete?: boolean;
}

export function CategoryAllocationTable({
  budgetPeriodId,
  totalAmount,
  categories,
  categoryBudgets,
  onSave,
  onEditCategory,
  onDeleteCategory,
  isLoading = false,
  suggestions = [],
  canWrite = true,
  canDelete = true,
}: CategoryAllocationTableProps) {
  // Separate root categories from subcategories
  const { rootCategories, subcategoryMap } = useMemo(() => {
    const roots: Category[] = [];
    const subs: Record<string, Category[]> = {};

    categories.forEach((cat) => {
      if (cat.parentId) {
        if (!subs[cat.parentId]) subs[cat.parentId] = [];
        subs[cat.parentId].push(cat);
      } else {
        roots.push(cat);
      }
    });

    return { rootCategories: roots, subcategoryMap: subs };
  }, [categories]);

  // Track which parents are expanded
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const toggleExpanded = (categoryId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
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
    return rootCategories.reduce((sum, cat) => sum + (percentages[cat.id] || 0), 0);
  }, [percentages, rootCategories]);

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

  /**
   * Distributes 100% equally across all root categories
   * Helps users get started quickly with balanced allocations
   */
  const distributeEqually = () => {
    const count = rootCategories.length;
    if (count === 0) return;

    const equalPercentage = parseFloat((100 / count).toFixed(1));
    const newPercentages: Record<string, number> = {};
    
    rootCategories.forEach((cat) => {
      newPercentages[cat.id] = equalPercentage;
    });

    setPercentages(newPercentages);
  };

  const handleSave = async () => {
    if (!isValid) return;

    const allocations = rootCategories
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
      return (
        <Badge variant="default" className="bg-warning">
          Cerca del límite
        </Badge>
      );
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
          <span className={`font-medium ${isValid ? 'text-success' : 'text-danger'}`}>
            {totalPercentage.toFixed(1)}% / 100%
          </span>
        </div>
        <Progress
          value={Math.min(totalPercentage, 100)}
          className={!isValid ? 'bg-danger-light' : undefined}
        />
        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>El total de porcentajes no puede superar 100%</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabla de categorías */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 cursor-help">
                        % Asignado
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Porcentaje del presupuesto total que destinas a esta categoría. El total debe sumar 100% o menos.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 cursor-help">
                        Monto Calculado
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Cantidad de dinero resultante según el porcentaje asignado. Se calcula automáticamente.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">Gastado</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 cursor-help">
                        Estado
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Indica si la categoría está sin usar, en progreso, completa o excedida según el gasto actual.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-center w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rootCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">No hay categorías disponibles</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Crea categorías de gastos (como Alimentación, Transporte, Entretenimiento) para poder asignarles presupuesto.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rootCategories.map((category) => {
              const info = getCategoryBudgetInfo(category.id);
              const suggestion = suggestions.find((s) => s.categoryId === category.id);
              const children = subcategoryMap[category.id] || [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents.has(category.id);

              // Aggregate subcategory spent amounts for informative display
              const childrenSpent = children.reduce((sum, child) => {
                const cb = categoryBudgets.find((cb) => cb.categoryId === child.id);
                return sum + (cb?.spentAmount || 0);
              }, 0);

              return (
                <Fragment key={category.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(category.id)}
                            className="p-0.5 hover:bg-accent rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        {hasChildren && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {children.length}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={info.percentage || ''}
                            onChange={(e) => handlePercentageChange(category.id, e.target.value)}
                            className="w-16 sm:w-20 text-right"
                            disabled={isLoading}
                          />
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {suggestion && info.percentage !== suggestion.suggestedPercentage && (
                          <div
                            className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors hover:underline text-right"
                            onClick={() =>
                              handlePercentageChange(
                                category.id,
                                suggestion.suggestedPercentage.toString()
                              )
                            }
                            title={`El mes pasado gastaste ${formatCurrency(suggestion.historicalAmount)}`}
                          >
                            Sugerido: {suggestion.suggestedPercentage}%
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(info.allocatedAmount)}
                    </TableCell>
                    <TableCell className="text-right text-expense">
                      {formatCurrency(info.spentAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <span
                          className={info.remainingAmount < 0 ? 'text-danger font-semibold' : ''}
                        >
                          {formatCurrency(Math.abs(info.remainingAmount))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(info)}
                        {info.allocatedAmount > 0 && (
                          <Progress
                            value={Math.min(info.usagePercentage, 100)}
                            className="h-1 w-24"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEditCategory && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditCategory(category)}
                            disabled={isLoading || !canWrite}
                            title={!canWrite ? 'No tienes permisos para editar categorías' : 'Editar categoría'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteCategory && !category.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteCategory(category)}
                            disabled={isLoading || !canDelete}
                            title={!canDelete ? 'No tienes permisos para eliminar categorías' : 'Eliminar categoría'}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Sub-categories (informative rows) */}
                  {hasChildren && isExpanded && children.map((child) => {
                    const childBudget = categoryBudgets.find((cb) => cb.categoryId === child.id);
                    const childSpent = childBudget?.spentAmount || 0;

                    return (
                      <TableRow key={child.id} className="bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2 pl-8">
                            <span className="text-muted-foreground">└</span>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: child.color || category.color }}
                            />
                            <span className="text-sm text-muted-foreground">{child.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-xs text-expense">
                          {childSpent > 0 ? formatCurrency(childSpent) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onEditCategory && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditCategory(child)}
                                disabled={isLoading || !canWrite}
                                title={!canWrite ? 'No tienes permisos para editar categorías' : 'Editar sub-categoría'}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            {onDeleteCategory && !child.isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteCategory(child)}
                                disabled={isLoading || !canDelete}
                                title={!canDelete ? 'No tienes permisos para eliminar categorías' : 'Eliminar sub-categoría'}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={distributeEqually} 
                disabled={isLoading || rootCategories.length === 0}
                variant="outline"
                size="lg"
                className="gap-2"
                data-tour="distribute-btn"
              >
                <Sparkles className="h-4 w-4" />
                Distribuir Equitativamente
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Distribuye automáticamente el 100% del presupuesto en partes iguales entre todas las categorías principales.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          onClick={handleSave}
          disabled={!isValid || isLoading}
          size="lg"
          data-tour="save-allocations-btn"
        >
          {isLoading ? 'Guardando...' : 'Guardar Asignaciones'}
        </Button>
      </div>
    </div>
  );
}
