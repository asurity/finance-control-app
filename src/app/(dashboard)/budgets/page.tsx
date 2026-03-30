'use client';

import { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { useCategoryBudgets } from '@/application/hooks/useCategoryBudgets';
import { useCategories } from '@/application/hooks/useCategories';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import new components
import { BudgetPeriodSelector } from '@/presentation/components/features/budgets/BudgetPeriodSelector';
import { CategoryAllocationTable } from '@/presentation/components/features/budgets/CategoryAllocationTable';
import { BudgetPeriodSummaryCard } from '@/presentation/components/features/budgets/BudgetPeriodSummaryCard';

import type { Category } from '@/types/firestore';

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
  // Hooks
  const budgetPeriodsHook = useBudgetPeriods(orgId);
  const categoryBudgetsHook = useCategoryBudgets(orgId);
  const categoriesHook = useCategories(orgId);

  // Queries
  const { data: budgetPeriodsData } = budgetPeriodsHook.useBudgetPeriodsByUser(userId);
  const budgetPeriods = budgetPeriodsData?.budgetPeriods || [];
  const { data: categories = [] } = categoriesHook.useAllCategories();

  // Filter only expense categories
  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.type === 'EXPENSE'),
    [categories]
  );

  // State
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isCreatePeriodDialogOpen, setIsCreatePeriodDialogOpen] = useState(false);
  const [isDeletePeriodDialogOpen, setIsDeletePeriodDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);

  // New period form state
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodAmount, setNewPeriodAmount] = useState<number | ''>('');
  const [newPeriodStartDate, setNewPeriodStartDate] = useState<Date>(startOfMonth(new Date()));
  const [newPeriodEndDate, setNewPeriodEndDate] = useState<Date>(endOfMonth(addMonths(new Date(), 0)));

  // Category management
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');

  // Get selected period and its category budgets
  const selectedPeriod = useMemo(
    () => budgetPeriods.find((p) => p.id === selectedPeriodId) || null,
    [budgetPeriods, selectedPeriodId]
  );

  const { data: categoryBudgetsData } = categoryBudgetsHook.useCategoryBudgetsByPeriod(
    selectedPeriodId || ''
  );
  const categoryBudgets = categoryBudgetsData?.categoryBudgets || [];

  // Auto-select active period on load
  useMemo(() => {
    if (!selectedPeriodId && budgetPeriods.length > 0) {
      const activePeriod = budgetPeriods.find((p) => p.isActive());
      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
      } else {
        setSelectedPeriodId(budgetPeriods[0].id);
      }
    }
  }, [budgetPeriods, selectedPeriodId]);

  // Handlers
  const handleCreatePeriod = async () => {
    if (!newPeriodAmount || newPeriodAmount <= 0) {
      toast.error('Ingresa un monto válido para el presupuesto');
      return;
    }

    if (newPeriodStartDate >= newPeriodEndDate) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      const result = await budgetPeriodsHook.createBudgetPeriod.mutateAsync({
        name: newPeriodName.trim() || undefined,
        totalAmount: Number(newPeriodAmount),
        startDate: newPeriodStartDate,
        endDate: newPeriodEndDate,
        userId,
      });

      toast.success('Período de presupuesto creado');
      setSelectedPeriodId(result.budgetPeriodId);
      setIsCreatePeriodDialogOpen(false);
      setNewPeriodName('');
      setNewPeriodAmount('');
      setNewPeriodStartDate(startOfMonth(addMonths(new Date(), 1)));
      setNewPeriodEndDate(endOfMonth(addMonths(new Date(), 1)));
    } catch (error: any) {
      console.error('Error al crear período:', error);
      toast.error('No se pudo crear el período', {
        description: error.message,
      });
    }
  };

  const handleDeletePeriod = async () => {
    if (!periodToDelete) return;

    try {
      await budgetPeriodsHook.deleteBudgetPeriod.mutateAsync({ id: periodToDelete, userId });
      toast.success('Período eliminado');
      setIsDeletePeriodDialogOpen(false);
      setPeriodToDelete(null);
      if (selectedPeriodId === periodToDelete) {
        setSelectedPeriodId(null);
      }
    } catch (error: any) {
      console.error('Error al eliminar período:', error);
      toast.error('No se pudo eliminar el período', {
        description: error.message,
      });
    }
  };

  const openDeleteDialog = (periodId: string) => {
    setPeriodToDelete(periodId);
    setIsDeletePeriodDialogOpen(true);
  };

  const handleSaveCategoryAllocations = async (
    allocations: { categoryId: string; percentage: number }[]
  ) => {
    if (!selectedPeriod) return;

    try {
      // Save each category budget
      for (const alloc of allocations) {
        await categoryBudgetsHook.setCategoryBudget.mutateAsync({
          budgetPeriodId: selectedPeriod.id,
          categoryId: alloc.categoryId,
          percentage: alloc.percentage,
          userId,
        });
      }

      toast.success('Asignaciones guardadas exitosamente');
    } catch (error: any) {
      console.error('Error al guardar asignaciones:', error);
      toast.error('No se pudieron guardar las asignaciones', {
        description: error.message,
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

      toast.success('Categoría creada');
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
      setIsCreateCategoryDialogOpen(false);
    } catch (error: any) {
      console.error('Error al crear categoría:', error);
      toast.error('No se pudo crear la categoría', {
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <p className="text-muted-foreground">
          Gestiona períodos de presupuesto y asigna porcentajes a cada categoría en {organizationName}.
        </p>
      </div>

      {/* Tabs: Períodos | Asignación por Categoría */}
      <Tabs defaultValue="periods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="periods">Períodos de Presupuesto</TabsTrigger>
          <TabsTrigger value="allocation" disabled={!selectedPeriod}>
            Asignación por Categoría
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!selectedPeriod}>
            Resumen
          </TabsTrigger>
        </TabsList>

        {/* TAB: Períodos de Presupuesto */}
        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Períodos</CardTitle>
                  <CardDescription>
                    Crea y administra períodos de presupuesto con montos y fechas definidas
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreatePeriodDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Período
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {budgetPeriods.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No hay períodos de presupuesto</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crea tu primer período para comenzar a asignar presupuestos por categoría
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsCreatePeriodDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Período
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgetPeriods.map((period) => {
                    const isActive = period.isActive();
                    const isExpired = period.hasExpired();
                    const isUpcoming = period.isUpcoming();

                    return (
                      <Card
                        key={period.id}
                        className={`cursor-pointer transition-all ${
                          selectedPeriodId === period.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedPeriodId(period.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">
                                  {period.name || 'Período sin nombre'}
                                </h3>
                                {isActive && <Badge variant="default">Activo</Badge>}
                                {isUpcoming && <Badge variant="secondary">Próximo</Badge>}
                                {isExpired && <Badge variant="outline">Expirado</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  {format(period.startDate, 'dd/MM/yyyy')} -{' '}
                                  {format(period.endDate, 'dd/MM/yyyy')}
                                </span>
                                <span>·</span>
                                <span className="font-medium">
                                  {formatCurrency(period.totalAmount)}
                                </span>
                                {isActive && (
                                  <>
                                    <span>·</span>
                                    <span>{period.getRemainingDays()} días restantes</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(period.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Asignación por Categoría */}
        <TabsContent value="allocation" className="space-y-4">
          {selectedPeriod && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Asignación por Categoría</CardTitle>
                      <CardDescription>
                        Distribuye el presupuesto de{' '}
                        <strong>{formatCurrency(selectedPeriod.totalAmount)}</strong> entre las
                        categorías de gastos
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreateCategoryDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Categoría
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Period Selector */}
                  <div className="mb-6">
                    <BudgetPeriodSelector
                      periods={budgetPeriods}
                      selectedId={selectedPeriodId}
                      onSelect={setSelectedPeriodId}
                    />
                  </div>

                  {expenseCategories.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No hay categorías de gastos. Crea al menos una categoría para poder
                        asignar presupuestos.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <CategoryAllocationTable
                      budgetPeriodId={selectedPeriod.id}
                      totalAmount={selectedPeriod.totalAmount}
                      categories={expenseCategories}
                      categoryBudgets={categoryBudgets}
                      onSave={handleSaveCategoryAllocations}
                      isLoading={categoryBudgetsHook.setCategoryBudget.isPending}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: Resumen */}
        <TabsContent value="summary" className="space-y-4">
          {selectedPeriod && (
            <>
              {/* Period Selector */}
              <BudgetPeriodSelector
                periods={budgetPeriods}
                selectedId={selectedPeriodId}
                onSelect={setSelectedPeriodId}
              />

              {/* Summary Card */}
              <BudgetPeriodSummaryCard
                budgetPeriod={selectedPeriod}
                categoryBudgets={categoryBudgets}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={isCreatePeriodDialogOpen} onOpenChange={setIsCreatePeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Período de Presupuesto</DialogTitle>
            <DialogDescription>
              Define un período con monto total y fechas de inicio y fin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Nombre (opcional)</Label>
              <Input
                id="period-name"
                placeholder="Ej: Presupuesto Enero 2026"
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-amount">Monto Total</Label>
              <Input
                id="period-amount"
                type="number"
                step="1000"
                placeholder="Ej: 1000000"
                value={newPeriodAmount}
                onChange={(e) => setNewPeriodAmount(Number(e.target.value) || '')}
              />
              {newPeriodAmount && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(Number(newPeriodAmount))}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input
                  type="date"
                  value={format(newPeriodStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => setNewPeriodStartDate(new Date(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input
                  type="date"
                  value={format(newPeriodEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => setNewPeriodEndDate(new Date(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatePeriodDialogOpen(false);
                setNewPeriodName('');
                setNewPeriodAmount('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePeriod}
              disabled={budgetPeriodsHook.createBudgetPeriod.isPending}
            >
              {budgetPeriodsHook.createBudgetPeriod.isPending ? 'Creando...' : 'Crear Período'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Period Dialog */}
      <AlertDialog open={isDeletePeriodDialogOpen} onOpenChange={setIsDeletePeriodDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar período?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todas las asignaciones de
              categoría asociadas a este período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePeriod}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría de gasto</DialogTitle>
            <DialogDescription>
              Crea una categoría personalizada para organizar tus gastos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre de la categoría</Label>
              <Input
                id="category-name"
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
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{newCategoryColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateCategoryDialogOpen(false);
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
    </div>
  );
}
