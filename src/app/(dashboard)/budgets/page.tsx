'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, TrendingUp, AlertCircle, Save, Percent, Plus, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useBudgets } from '@/application/hooks/useBudgets';
import { useCategories } from '@/application/hooks/useCategories';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { Category } from '@/types/firestore';

const BudgetConfigSchema = z.object({
  totalMonthlyBudget: z.number().positive('El presupuesto debe ser mayor a 0'),
  startDate: z.date(),
  endDate: z.date(),
  allocations: z.record(z.string(), z.number().min(0).max(100)),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  }
);

type BudgetConfigFormValues = z.infer<typeof BudgetConfigSchema>;

export default function BudgetsPage() {
  const { user } = useAuth();
  const { currentOrgId, currentOrganization } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando presupuestos...</p>
      </div>
    );
  }

  return (
    <BudgetsContent
      orgId={currentOrgId}
      userId={user.id}
      organizationName={currentOrganization?.name || 'Organización actual'}
    />
  );
}

function BudgetsContent({
  orgId,
  userId,
  organizationName,
}: {
  orgId: string;
  userId: string;
  organizationName: string;
}) {
  const budgetsHook = useBudgets(orgId);
  const categoriesHook = useCategories(orgId);
  const { data: categories = [] } = categoriesHook.useAllCategories();
  const { data: existingBudgets = [] } = budgetsHook.useActiveBudgets();

  // Category creation/editing states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');

  // Helper function to format date input
  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
    }
  };

  // Parse date from dd-mm-yyyy format
  const parseDateInput = (value: string): Date | null => {
    if (value.length === 10) {
      const parts = value.split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          return newDate;
        }
      }
    }
    return null;
  };

  // Filter only expense categories
  const expenseCategories = categories.filter((cat) => cat.type === 'EXPENSE');

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    // Initialize with existing budgets if any
    const initial: Record<string, number> = {};
    expenseCategories.forEach((cat) => {
      const existing = existingBudgets.find((b) => b.categoryId === cat.id);
      initial[cat.id] = 0;
    });
    return initial;
  });

  const [totalMonthlyBudget, setTotalMonthlyBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(addMonths(new Date(), 1)));

  // Date input states (after startDate and endDate are initialized)
  const [startDateInput, setStartDateInput] = useState(() => format(startOfMonth(new Date()), 'dd-MM-yyyy'));
  const [endDateInput, setEndDateInput] = useState(() => format(endOfMonth(addMonths(new Date(), 1)), 'dd-MM-yyyy'));

  // Sync date inputs when dates change
  useEffect(() => {
    setStartDateInput(format(startDate, 'dd-MM-yyyy'));
  }, [startDate]);

  useEffect(() => {
    setEndDateInput(format(endDate, 'dd-MM-yyyy'));
  }, [endDate]);

  // Calculate totals
  const totalAllocatedPercent = useMemo(() => {
    return Object.values(allocations).reduce((sum, percent) => sum + (percent || 0), 0);
  }, [allocations]);

  const budgetsByCategory = useMemo(() => {
    return expenseCategories.map((category) => {
      const percent = allocations[category.id] || 0;
      const amount = (totalMonthlyBudget * percent) / 100;
      const existing = existingBudgets.find((b) => b.categoryId === category.id);
      
      return {
        category,
        percent,
        amount,
        existing,
        spent: existing?.spent || 0,
        percentUsed: existing ? (existing.spent / existing.amount) * 100 : 0,
      };
    });
  }, [expenseCategories, allocations, totalMonthlyBudget, existingBudgets]);

  const handleAllocationChange = (categoryId: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, Math.min(100, value)),
    }));
  };

  const handleSaveBudgets = async () => {
    if (totalMonthlyBudget <= 0) {
      toast.error('Debes definir un presupuesto mensual mayor a 0');
      return;
    }

    if (totalAllocatedPercent > 100) {
      toast.error('Los porcentajes no pueden superar 100%', {
        description: `Actualmente suman ${totalAllocatedPercent.toFixed(1)}%`,
      });
      return;
    }

    try {
      const budgetsToCreate = budgetsByCategory.filter((b) => b.percent > 0 && b.amount > 0);

      if (budgetsToCreate.length === 0) {
        toast.error('Debes asignar al menos una categoría con presupuesto');
        return;
      }

      // Create all budgets
      for (const item of budgetsToCreate) {
        await budgetsHook.createBudget.mutateAsync({
          name: `${item.category.name} - ${organizationName}`,
          amount: item.amount,
          period: 'MONTHLY',
          categoryId: item.category.id,
          userId,
          startDate,
          endDate,
          alertThreshold: 80,
          isActive: true,
        });
      }

      toast.success(`${budgetsToCreate.length} presupuestos creados exitosamente`);
      
      // No reseteamos los valores para que el usuario pueda seguir editando
    } catch (error: any) {
      console.error('Error al crear presupuestos:', error);
      toast.error('No se pudieron crear los presupuestos', {
        description: error.message || 'Inténtalo nuevamente.',
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Ingresa un nombre para la categoría');
      return;
    }

    try {
      await categoriesHook.createCategory.mutateAsync({
        name: newCategoryName.trim(),
        type: 'EXPENSE',
        color: newCategoryColor,
        icon: 'tag',
      });

      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error('Error al crear categoría:', error);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      toast.error('Ingresa un nombre válido');
      return;
    }

    try {
      await categoriesHook.updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name: newCategoryName.trim(),
          color: newCategoryColor,
        },
      });

      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error al editar categoría:', error);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setIsEditDialogOpen(true);
  };

  const isValidAllocation = totalAllocatedPercent <= 100;
  const hasDefinedBudget = totalMonthlyBudget > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <p className="text-muted-foreground">
          Define tu presupuesto mensual y asigna porcentajes a cada categoría de gasto en {organizationName}.
        </p>
      </div>

      {existingBudgets.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ya tienes {existingBudgets.length} presupuestos activos. Si creas nuevos presupuestos
            para las mismas categorías, se agregarán a los existentes.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Configuración
            </CardTitle>
            <CardDescription>
              Define el monto total mensual a distribuir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="totalBudget">Presupuesto mensual total</Label>
              <Input
                id="totalBudget"
                type="number"
                step="1000"
                placeholder="Ej: 1000000"
                value={totalMonthlyBudget || ''}
                onChange={(e) => setTotalMonthlyBudget(Number(e.target.value) || 0)}
              />
              {hasDefinedBudget && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalMonthlyBudget)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Periodo</Label>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                    Fecha de inicio
                  </Label>
                  <Input
                    id="startDate"
                    type="text"
                    placeholder="dd-mm-aaaa"
                    value={startDateInput}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setStartDateInput(formatted);
                      
                      const parsed = parseDateInput(formatted);
                      if (parsed) {
                        setStartDate(parsed);
                      }
                    }}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                    Fecha de fin
                  </Label>
                  <Input
                    id="endDate"
                    type="text"
                    placeholder="dd-mm-aaaa"
                    value={endDateInput}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setEndDateInput(formatted);
                      
                      const parsed = parseDateInput(formatted);
                      if (parsed) {
                        setEndDate(parsed);
                      }
                    }}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Porcentaje asignado</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-bold ${
                        totalAllocatedPercent === 100
                          ? 'text-green-600'
                          : totalAllocatedPercent > 100
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {totalAllocatedPercent.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">/ 100%</span>
                  </div>
                </div>
                
                <Progress 
                  value={Math.min(totalAllocatedPercent, 100)} 
                  className={`h-3 ${
                    totalAllocatedPercent > 100 ? 'bg-red-100' : ''
                  }`}
                />
                
                <div className="mt-2">
                  {totalAllocatedPercent === 100 && (
                    <Alert className="py-2 bg-green-50 border-green-200">
                      <AlertDescription className="text-xs text-green-700">
                        ✓ Perfecto: Has asignado el 100% del presupuesto
                      </AlertDescription>
                    </Alert>
                  )}
                  {totalAllocatedPercent > 0 && totalAllocatedPercent < 100 && (
                    <Alert className="py-2 bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-xs text-yellow-700">
                        Opcional: Faltan {(100 - totalAllocatedPercent).toFixed(1)}% por asignar
                      </AlertDescription>
                    </Alert>
                  )}
                  {totalAllocatedPercent > 100 && (
                    <Alert className="py-2 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-xs text-red-700 font-medium">
                        ¡Excedido! Sobrepasa el límite por {(totalAllocatedPercent - 100).toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveBudgets}
              className="w-full"
              disabled={
                !hasDefinedBudget ||
                !isValidAllocation ||
                budgetsHook.createBudget.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {budgetsHook.createBudget.isPending ? 'Guardando...' : 'Guardar presupuestos'}
            </Button>
          </CardContent>
        </Card>

        {/* Categories Allocation Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Asignación por categoría
                </CardTitle>
                <CardDescription>
                  {expenseCategories.length} categorías de gastos disponibles
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva categoría
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No hay categorías de gastos</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Las categorías se crearán automáticamente al usar la aplicación.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="w-[120px]">% Asignar</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetsByCategory.map((item) => (
                      <TableRow key={item.category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.category.color }}
                            />
                            <span className="font-medium">{item.category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={item.percent !== undefined ? item.percent : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === null) {
                                handleAllocationChange(item.category.id, 0);
                              } else {
                                handleAllocationChange(item.category.id, Number(val));
                              }
                            }}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {hasDefinedBudget
                            ? formatCurrency(item.amount)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.existing ? (
                            <div>
                              <div>{formatCurrency(item.existing.amount)}</div>
                              <div className="text-xs">
                                {item.percentUsed.toFixed(0)}% usado
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item.category)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría de gasto</DialogTitle>
            <DialogDescription>
              Crea una categoría personalizada para organizar tus gastos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la categoría</Label>
              <Input
                id="name"
                placeholder="Ej: Mascotas, Suscripciones, etc."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  {newCategoryColor}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewCategoryName('');
                setNewCategoryColor('#3b82f6');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={categoriesHook.createCategory.isPending}
            >
              {categoriesHook.createCategory.isPending ? 'Creando...' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>
              Modifica el nombre o color de la categoría
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre de la categoría</Label>
              <Input
                id="edit-name"
                placeholder="Nombre de la categoría"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditCategory();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  {newCategoryColor}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCategory(null);
                setNewCategoryName('');
                setNewCategoryColor('#3b82f6');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={categoriesHook.updateCategory.isPending}
            >
              {categoriesHook.updateCategory.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
