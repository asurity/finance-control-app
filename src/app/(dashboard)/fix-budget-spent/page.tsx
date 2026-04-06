'use client';

/**
 * Fix Budget Spent Amounts Page
 * Recalculates and updates spentAmount for all category budgets
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FixBudgetSpentPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fixSpentAmounts = async () => {
    if (!user || !currentOrgId) return;

    try {
      setLoading(true);
      setError(null);
      setResults(null);

      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);

      const transactionRepo = container.getTransactionRepository();
      const budgetPeriodRepo = container.getBudgetPeriodRepository();
      const categoryBudgetRepo = container.getCategoryBudgetRepository();

      console.log('🔧 CORRECCIÓN DE SPENT AMOUNTS - INICIADO');
      console.log('═'.repeat(100));

      // Step 1: Get all budget periods
      console.log('\n📅 Paso 1: Obteniendo períodos de presupuesto...');
      const allPeriods = await budgetPeriodRepo.getAll();
      console.log(`   Encontrados: ${allPeriods.length} períodos`);

      const updates: any[] = [];
      let totalUpdated = 0;
      let totalErrors = 0;

      // Step 2: Process each period
      for (const period of allPeriods) {
        console.log(`\n📊 Procesando: ${period.name || 'Sin nombre'}`);
        console.log(`   Inicio: ${period.startDate.toLocaleDateString('es-CL')}`);
        console.log(`   Fin: ${period.endDate.toLocaleDateString('es-CL')}`);

        // Get category budgets for this period
        const categoryBudgets = await categoryBudgetRepo.getByBudgetPeriodId(period.id);
        console.log(`   Category budgets: ${categoryBudgets.length}`);

        // Get all transactions in this period using getByDateRange (includes boundaries)
        const transactionsInPeriod = await transactionRepo.getByDateRange(
          period.startDate,
          period.endDate
        );

        console.log(`   Transacciones en período: ${transactionsInPeriod.length}`);

        // Process each category budget
        for (const categoryBudget of categoryBudgets) {
          // Filter transactions for this category
          const categoryTransactions = transactionsInPeriod.filter(
            (tx) => tx.categoryId === categoryBudget.categoryId && tx.type === 'EXPENSE'
          );

          // Calculate total spent
          const calculatedSpent = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);

          const currentSpent = categoryBudget.spentAmount;
          const difference = Math.abs(calculatedSpent - currentSpent);

          if (difference > 0.01) {
            // Allow for floating point precision
            console.log(`   ⚠️  Diferencia encontrada en categoría ${categoryBudget.categoryId}`);
            console.log(`      Actual en DB: ${currentSpent.toLocaleString('es-CL')} CLP`);
            console.log(`      Calculado: ${calculatedSpent.toLocaleString('es-CL')} CLP`);
            console.log(`      Diferencia: ${difference.toLocaleString('es-CL')} CLP`);

            try {
              // Update the spent amount
              await categoryBudgetRepo.updateSpentAmount(categoryBudget.id, calculatedSpent);

              console.log(`      ✅ Actualizado correctamente`);

              updates.push({
                periodName: period.name || 'Sin nombre',
                categoryId: categoryBudget.categoryId,
                oldSpent: currentSpent,
                newSpent: calculatedSpent,
                difference,
                success: true,
              });

              totalUpdated++;
            } catch (err) {
              console.error(`      ❌ Error al actualizar:`, err);

              updates.push({
                periodName: period.name || 'Sin nombre',
                categoryId: categoryBudget.categoryId,
                oldSpent: currentSpent,
                newSpent: calculatedSpent,
                difference,
                success: false,
                error: err instanceof Error ? err.message : 'Error desconocido',
              });

              totalErrors++;
            }
          } else {
            console.log(`   ✅ Categoría ${categoryBudget.categoryId} OK (sin diferencias)`);
          }
        }
      }

      console.log('\n' + '═'.repeat(100));
      console.log('\n📊 RESUMEN:');
      console.log(`   Total actualizados: ${totalUpdated}`);
      console.log(`   Total errores: ${totalErrors}`);
      console.log('✅ Proceso completado\n');

      setResults({
        updates,
        totalUpdated,
        totalErrors,
      });

      if (totalUpdated > 0) {
        toast.success(`${totalUpdated} presupuestos actualizados correctamente`);
      }

      if (totalErrors > 0) {
        toast.error(`${totalErrors} errores durante la actualización`);
      }

      if (totalUpdated === 0 && totalErrors === 0) {
        toast.info('No se encontraron diferencias. Todo está sincronizado.');
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Error al corregir montos');
      toast.error('Error al corregir montos');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          🔧 Corregir Montos de Presupuesto
        </h1>
        <p className="text-muted-foreground">
          Recalcula y actualiza los spentAmount basándose en transacciones reales
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Corrección Automática</CardTitle>
          <CardDescription>
            Este proceso recalculará el monto gastado (spentAmount) para todos los presupuestos de
            categoría basándose en las transacciones reales del período.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  ¿Qué hace este proceso?
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
                  <li>Obtiene todos los períodos de presupuesto</li>
                  <li>Para cada categoría, suma las transacciones REALES del período</li>
                  <li>Compara con el spentAmount almacenado</li>
                  <li>Actualiza los valores incorrectos</li>
                  <li>
                    Usa{' '}
                    <code className="bg-info-light px-1 rounded">
                      {'>='} y {'<='}
                    </code>{' '}
                    para incluir fechas límite
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={fixSpentAmounts} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Corrigiendo...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Ejecutar Corrección
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-900 dark:text-red-100 font-semibold">Error</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {results.totalUpdated}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">Actualizados</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {results.totalErrors}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">Errores</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {results.updates.length}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total procesados</p>
                </div>
              </div>

              {results.updates.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold mb-3">Detalle de actualizaciones:</h3>
                  {results.updates.map((update: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 border rounded-lg ${
                        update.success
                          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {update.success ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <p className="font-medium">{update.periodName}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Categoría: {update.categoryId}
                          </p>
                          <div className="mt-2 text-sm grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-muted-foreground">Anterior:</p>
                              <p className="font-medium">
                                ${update.oldSpent.toLocaleString('es-CL')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Nuevo:</p>
                              <p className="font-medium text-green-600">
                                ${update.newSpent.toLocaleString('es-CL')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Diferencia:</p>
                              <p className="font-medium">
                                ${update.difference.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>
                          {!update.success && update.error && (
                            <p className="text-xs text-red-600 mt-2">Error: {update.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Próximos pasos</p>
                  <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1 list-disc list-inside">
                    <li>Refresca la página de Presupuestos para ver los cambios</li>
                    <li>Verifica que los montos ahora coincidan con las transacciones</li>
                    <li>Revisa la consola del navegador (F12) para detalles completos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
