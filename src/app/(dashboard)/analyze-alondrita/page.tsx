'use client';

/**
 * Analyze Alondrita Budget Page
 * Investigates discrepancies in budget calculations
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORY_ID = 'Vdqwvk7O9vWArvw1u7Do'; // Alondrita
const DISPLAYED_AMOUNT = 17740;

export default function AnalyzeAlondritaPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!user || !currentOrgId) return;

    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);

      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);

      const transactionRepo = container.getTransactionRepository();
      const categoryRepo = container.getCategoryRepository();
      const budgetPeriodRepo = container.getBudgetPeriodRepository();
      const categoryBudgetRepo = container.getCategoryBudgetRepository();

      console.log('🔍 ANÁLISIS DE ALONDRITA - INICIADO');
      console.log('═'.repeat(100));

      // Step 1: Get category
      console.log('\n📂 Paso 1: Obteniendo categoría...');
      const category = await categoryRepo.getById(CATEGORY_ID);

      if (!category) {
        throw new Error('Categoría Alondrita no encontrada');
      }

      console.log(`✅ Categoría: ${category.name}`);
      console.log(`   ID: ${category.id}`);
      console.log(`   Tipo: ${category.type}`);

      // Step 2: Get ALL transactions for this category
      console.log('\n💰 Paso 2: Obteniendo transacciones...');
      const allTransactions = await transactionRepo.getAll();
      const categoryTransactions = allTransactions
        .filter((tx) => tx.categoryId === CATEGORY_ID)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log(`   Total transacciones: ${categoryTransactions.length}`);

      const expenses = categoryTransactions.filter((tx) => tx.type === 'EXPENSE');
      const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

      console.log(`   Gastos (EXPENSE): ${expenses.length}`);
      console.log(`   Total gastado: ${totalExpense.toLocaleString('es-CL')} CLP`);

      categoryTransactions.forEach((tx, i) => {
        console.log(`\n   #${i + 1} ${tx.description}`);
        console.log(`      Monto: ${tx.amount.toLocaleString('es-CL')} CLP`);
        console.log(`      Tipo: ${tx.type}`);
        console.log(`      Fecha: ${format(tx.date, 'dd/MM/yyyy HH:mm:ss')}`);
        if (tx.isInstallment) {
          console.log(`      Cuota: ${tx.installmentNumber}/${tx.totalInstallments}`);
        }
      });

      // Step 3: Get budget periods
      console.log('\n\n📅 Paso 3: Analizando períodos de presupuesto...');
      const allPeriods = await budgetPeriodRepo.getAll();
      console.log(`   Total períodos: ${allPeriods.length}`);

      const now = new Date();
      const activePeriod = allPeriods.find((p) => p.isActive());

      if (!activePeriod) {
        console.log('   ⚠️  No hay período activo');
      } else {
        console.log(`   ✅ Período activo: ${activePeriod.name}`);
        console.log(`      Inicio: ${format(activePeriod.startDate, 'dd/MM/yyyy HH:mm:ss')}`);
        console.log(`      Fin: ${format(activePeriod.endDate, 'dd/MM/yyyy HH:mm:ss')}`);

        // Filter by active period
        const txInPeriod = expenses.filter(
          (tx) => tx.date >= activePeriod.startDate && tx.date <= activePeriod.endDate
        );

        const txOutsidePeriod = expenses.filter(
          (tx) => tx.date < activePeriod.startDate || tx.date > activePeriod.endDate
        );

        const totalInPeriod = txInPeriod.reduce((sum, tx) => sum + tx.amount, 0);

        console.log(`\n   📊 Transacciones EN período: ${txInPeriod.length}`);
        console.log(`      Total: ${totalInPeriod.toLocaleString('es-CL')} CLP`);

        txInPeriod.forEach((tx, i) => {
          console.log(
            `      ${i + 1}. ${tx.description}: ${tx.amount.toLocaleString('es-CL')} CLP (${format(tx.date, 'dd/MM/yyyy')})`
          );
        });

        if (txOutsidePeriod.length > 0) {
          console.log(`\n   ⚠️  Transacciones FUERA de período: ${txOutsidePeriod.length}`);
          txOutsidePeriod.forEach((tx, i) => {
            console.log(
              `      ${i + 1}. ${tx.description}: ${tx.amount.toLocaleString('es-CL')} CLP (${format(tx.date, 'dd/MM/yyyy')})`
            );
          });
        }

        // Step 4: Get category budget
        console.log('\n\n💼 Paso 4: Verificando category budget...');
        const categoryBudget = await categoryBudgetRepo.getByBudgetPeriodAndCategory(
          activePeriod.id,
          CATEGORY_ID
        );

        if (!categoryBudget) {
          console.log('   ⚠️  No existe category budget');
        } else {
          console.log(`   ✅ Category Budget encontrado`);
          console.log(`      Porcentaje: ${categoryBudget.percentage}%`);
          console.log(
            `      Asignado: ${categoryBudget.allocatedAmount.toLocaleString('es-CL')} CLP`
          );
          console.log(
            `      Gastado (spentAmount): ${categoryBudget.spentAmount.toLocaleString('es-CL')} CLP`
          );
          console.log(
            `      Restante: ${categoryBudget.getRemainingAmount().toLocaleString('es-CL')} CLP`
          );

          console.log('\n   🔎 COMPARACIÓN:');
          console.log(
            `      spentAmount en DB: ${categoryBudget.spentAmount.toLocaleString('es-CL')} CLP`
          );
          console.log(`      Total calculado: ${totalInPeriod.toLocaleString('es-CL')} CLP`);
          console.log(`      Mostrado en UI: ${DISPLAYED_AMOUNT.toLocaleString('es-CL')} CLP`);
          console.log(
            `      Diferencia DB vs Calculado: ${Math.abs(categoryBudget.spentAmount - totalInPeriod).toLocaleString('es-CL')} CLP`
          );
          console.log(
            `      Diferencia UI vs Calculado: ${Math.abs(DISPLAYED_AMOUNT - totalInPeriod).toLocaleString('es-CL')} CLP`
          );
        }

        setAnalysis({
          category,
          allTransactions: categoryTransactions,
          expenses,
          totalExpense,
          activePeriod,
          txInPeriod,
          txOutsidePeriod,
          totalInPeriod,
          categoryBudget,
          displayedAmount: DISPLAYED_AMOUNT,
        });
      }

      console.log('\n' + '═'.repeat(100));
      console.log('✅ Análisis completado');
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Error al analizar');
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
          🔍 Análisis: Categoría Alondrita
        </h1>
        <p className="text-muted-foreground">
          Investigación de discrepancias en totalización de presupuesto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Problema</CardTitle>
          <CardDescription>Categoría ID: {CATEGORY_ID}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Discrepancia Detectada
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  La tabla de presupuestos muestra <strong>$17,740 CLP</strong> pero hay evidencia
                  de más gastos. Este análisis identificará qué transacciones no están siendo
                  contabilizadas.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={runAnalysis} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Ejecutar Análisis
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

      {analysis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Análisis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transacciones</p>
                  <p className="text-2xl font-bold">{analysis.allTransactions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gastos</p>
                  <p className="text-2xl font-bold text-red-600">{analysis.expenses.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Real</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${analysis.totalExpense.toLocaleString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mostrado</p>
                  <p className="text-2xl font-bold">
                    ${analysis.displayedAmount.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>

              {analysis.activePeriod && (
                <>
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2">
                      Período Activo: {analysis.activePeriod.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium">
                          {format(analysis.activePeriod.startDate, 'dd/MM/yyyy HH:mm:ss', {
                            locale: es,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fin</p>
                        <p className="font-medium">
                          {format(analysis.activePeriod.endDate, 'dd/MM/yyyy HH:mm:ss', {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3">Transacciones en Período</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <span className="text-sm font-medium">
                          En período ({analysis.txInPeriod.length})
                        </span>
                        <span className="font-bold text-green-700 dark:text-green-300">
                          ${analysis.totalInPeriod.toLocaleString('es-CL')}
                        </span>
                      </div>
                      {analysis.txOutsidePeriod.length > 0 && (
                        <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <span className="text-sm font-medium">
                            Fuera de período ({analysis.txOutsidePeriod.length})
                          </span>
                          <Badge variant="outline">No contabilizadas</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {analysis.categoryBudget && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-3">Category Budget (Base de Datos)</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">spentAmount (DB):</span>
                          <span className="font-medium">
                            ${analysis.categoryBudget.spentAmount.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total calculado:</span>
                          <span className="font-medium">
                            ${analysis.totalInPeriod.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Diferencia:</span>
                          <span
                            className={
                              Math.abs(
                                analysis.categoryBudget.spentAmount - analysis.totalInPeriod
                              ) > 1
                                ? 'text-red-600'
                                : 'text-green-600'
                            }
                          >
                            $
                            {Math.abs(
                              analysis.categoryBudget.spentAmount - analysis.totalInPeriod
                            ).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle de Transacciones</CardTitle>
              <CardDescription>Abre la consola (F12) para ver el análisis completo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysis.txInPeriod.map((tx: any, i: number) => (
                  <div key={tx.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(tx.date, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                        </p>
                      </div>
                      <p className="font-bold text-red-600">${tx.amount.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
