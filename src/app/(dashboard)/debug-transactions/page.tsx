'use client';

/**
 * Debug Transactions Page
 * Helps diagnose transaction totalization issues
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionDebugInfo {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: Date;
  categoryName: string;
  categoryId: string;
  accountName: string;
  userId: string;
  isInstallment?: boolean;
  installmentInfo?: string;
}

interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  transactions: TransactionDebugInfo[];
}

export default function DebugTransactionsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CategoryAnalysis[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeTransactions = async () => {
    if (!user || !currentOrgId) return;

    try {
      setLoading(true);
      setError(null);

      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);

      const transactionRepo = container.getTransactionRepository();
      const categoryRepo = container.getCategoryRepository();
      const accountRepo = container.getAccountRepository();

      // Get all data
      const allTransactions = await transactionRepo.getAll();
      const allCategories = await categoryRepo.getAll();
      const allAccounts = await accountRepo.getAll();

      console.log('📊 Total transactions:', allTransactions.length);
      console.log('📂 Total categories:', allCategories.length);
      console.log('💰 Total accounts:', allAccounts.length);

      // Create maps for quick lookup
      const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));
      const accountMap = new Map(allAccounts.map((a) => [a.id, a.name]));

      // Group transactions by category
      const categoryGroups = new Map<string, TransactionDebugInfo[]>();

      allTransactions.forEach((tx) => {
        if (tx.type !== 'EXPENSE') return; // Only expenses for this analysis

        const categoryName = categoryMap.get(tx.categoryId) || 'Sin categoría';
        const accountName = accountMap.get(tx.accountId) || 'Cuenta desconocida';

        const debugInfo: TransactionDebugInfo = {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
          categoryName,
          categoryId: tx.categoryId,
          accountName,
          userId: tx.userId,
          isInstallment: tx.isInstallment,
          installmentInfo: tx.isInstallment
            ? `Cuota ${tx.installmentNumber}/${tx.totalInstallments}`
            : undefined,
        };

        const existing = categoryGroups.get(tx.categoryId) || [];
        existing.push(debugInfo);
        categoryGroups.set(tx.categoryId, existing);
      });

      // Calculate totals per category
      const categoryAnalysis: CategoryAnalysis[] = [];

      categoryGroups.forEach((transactions, categoryId) => {
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const categoryName = categoryMap.get(categoryId) || 'Sin categoría';

        categoryAnalysis.push({
          categoryId,
          categoryName,
          totalAmount,
          transactionCount: transactions.length,
          transactions: transactions.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
      });

      // Sort by total amount (descending)
      categoryAnalysis.sort((a, b) => b.totalAmount - a.totalAmount);

      setAnalysis(categoryAnalysis);

      // Log detailed info
      console.log('\n📈 ANÁLISIS POR CATEGORÍA:');
      categoryAnalysis.forEach((cat, index) => {
        console.log(`\n${index + 1}. ${cat.categoryName}`);
        console.log(`   Total: ${cat.totalAmount.toLocaleString('es-CL')} CLP`);
        console.log(`   Transacciones: ${cat.transactionCount}`);
        console.log('   Detalle:');
        cat.transactions.forEach((tx, i) => {
          const installmentStr = tx.installmentInfo ? ` [${tx.installmentInfo}]` : '';
          console.log(
            `      ${i + 1}. ${tx.description}${installmentStr}: ${tx.amount.toLocaleString('es-CL')} CLP (${format(tx.date, 'dd/MM/yyyy')})`
          );
        });
      });
    } catch (err: any) {
      console.error('Error analyzing transactions:', err);
      setError(err.message || 'Error al analizar transacciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentOrgId) {
      analyzeTransactions();
    }
  }, [user, currentOrgId]);

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const selectedCategoryData = selectedCategory
    ? analysis.find((c) => c.categoryId === selectedCategory)
    : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            🔍 Debug: Análisis de Transacciones
          </h1>
          <p className="text-muted-foreground">
            Diagnóstico detallado de totalizaciones por categoría
          </p>
        </div>
        <Button onClick={analyzeTransactions} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">❌ Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Categoría</CardTitle>
            <CardDescription>{analysis.length} categorías con gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.map((cat) => (
                <div
                  key={cat.categoryId}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                    selectedCategory === cat.categoryId ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => setSelectedCategory(cat.categoryId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{cat.categoryName}</p>
                      <p className="text-sm text-muted-foreground">
                        {cat.transactionCount} transacciones
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-expense">
                        {cat.totalAmount.toLocaleString('es-CL')} CLP
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {analysis.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay datos para mostrar
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCategoryData
                ? `Detalle: ${selectedCategoryData.categoryName}`
                : 'Selecciona una categoría'}
            </CardTitle>
            {selectedCategoryData && (
              <CardDescription>
                Total: {selectedCategoryData.totalAmount.toLocaleString('es-CL')} CLP (
                {selectedCategoryData.transactionCount} transacciones)
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedCategoryData ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedCategoryData.transactions.map((tx, index) => (
                  <div key={tx.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{index + 1}
                          </span>
                          {tx.isInstallment && (
                            <Badge variant="outline" className="text-xs">
                              {tx.installmentInfo}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          <p>📅 {format(tx.date, "dd 'de' MMMM yyyy", { locale: es })}</p>
                          <p>💳 {tx.accountName}</p>
                          <p className="font-mono">ID: {tx.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-expense">
                          {tx.amount.toLocaleString('es-CL')} CLP
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Selecciona una categoría para ver sus transacciones</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Console Instructions */}
      <Card className="bg-muted">
        <CardHeader>
          <CardTitle className="text-base">💡 Información adicional</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Abre la consola del navegador (F12) para ver logs detallados</p>
          <p>• Los totales mostrados aquí son calculados directamente de Firestore</p>
          <p>
            • Si los totales aquí coinciden con tus registros pero el dashboard muestra otra cosa,
            hay un problema en el filtrado de fecha del dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
