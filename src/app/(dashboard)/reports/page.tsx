'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download, TrendingUp, TrendingDown, PieChart, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useBudgets } from '@/application/hooks/useBudgets';
import { useCategories } from '@/application/hooks/useCategories';
import { useAccounts } from '@/application/hooks/useAccounts';
import { formatCurrencyAbsolute, formatCurrencyWithSign } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Transaction, Category, Budget, Account } from '@/types/firestore';

type PeriodPreset = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'current_year' | 'custom';

export default function ReportsPage() {
  const { user } = useAuth();
  const { currentOrgId, currentOrganization } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <ReportsContent
      orgId={currentOrgId}
      userId={user.id}
      organizationName={currentOrganization?.name || 'Organización actual'}
    />
  );
}

function ReportsContent({
  orgId,
  userId,
  organizationName,
}: {
  orgId: string;
  userId: string;
  organizationName: string;
}) {
  // Period selection
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('current_month');
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(new Date()));

  // Hooks
  const transactionsHook = useTransactions(orgId);
  const budgetsHook = useBudgets(orgId);
  const categoriesHook = useCategories(orgId);
  const accountsHook = useAccounts(orgId);

  const { data: transactions = [] } = transactionsHook.useTransactionsByDateRange(startDate, endDate);
  const { data: categories = [] } = categoriesHook.useAllCategories();
  const { data: budgets = [] } = budgetsHook.useActiveBudgets();
  const { data: accounts = [] } = accountsHook.useAllAccounts();

  // Handle period preset changes
  const handlePeriodChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();

    switch (preset) {
      case 'current_month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'last_3_months':
        setStartDate(startOfMonth(subMonths(now, 2)));
        setEndDate(endOfMonth(now));
        break;
      case 'last_6_months':
        setStartDate(startOfMonth(subMonths(now, 5)));
        setEndDate(endOfMonth(now));
        break;
      case 'current_year':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(new Date(now.getFullYear(), 11, 31));
        break;
    }
  };

  // Calculate report data
  const reportData = useMemo(() => {
    const userTransactions = transactions.filter(t => t.userId === userId);
    
    const income = userTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = userTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Group expenses by category
    const expensesByCategory: Record<string, { amount: number; count: number; categoryName: string; color: string }> = {};
    userTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        if (!expensesByCategory[t.categoryId]) {
          expensesByCategory[t.categoryId] = {
            amount: 0,
            count: 0,
            categoryName: category?.name || 'Sin categoría',
            color: category?.color || '#gray',
          };
        }
        expensesByCategory[t.categoryId].amount += t.amount;
        expensesByCategory[t.categoryId].count += 1;
      });

    const categoryExpenses = Object.entries(expensesByCategory)
      .map(([categoryId, data]) => ({
        categoryId,
        ...data,
        percentage: expenses > 0 ? (data.amount / expenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Budget vs actual
    const budgetComparison = budgets
      .filter(b => b.isActive)
      .map(budget => {
        const category = categories.find(c => c.id === budget.categoryId);
        const spent = budget.spent || 0;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        const remaining = budget.amount - spent;

        return {
          budgetId: budget.id,
          categoryName: category?.name || 'Sin categoría',
          budgeted: budget.amount,
          spent,
          remaining,
          percentage,
          status: percentage > 100 ? 'exceeded' : percentage > 80 ? 'warning' : 'ok',
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Group by account
    const byAccount: Record<string, { income: number; expenses: number; net: number; accountName: string }> = {};
    userTransactions.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      if (!byAccount[t.accountId]) {
        byAccount[t.accountId] = {
          income: 0,
          expenses: 0,
          net: 0,
          accountName: account?.name || 'Sin cuenta',
        };
      }
      if (t.type === 'INCOME') {
        byAccount[t.accountId].income += t.amount;
        byAccount[t.accountId].net += t.amount;
      } else {
        byAccount[t.accountId].expenses += t.amount;
        byAccount[t.accountId].net -= t.amount;
      }
    });

    const accountSummary = Object.entries(byAccount).map(([accountId, data]) => ({
      accountId,
      ...data,
    }));

    return {
      income,
      expenses,
      netBalance,
      savingsRate,
      categoryExpenses,
      budgetComparison,
      accountSummary,
      transactionCount: userTransactions.length,
    };
  }, [transactions, categories, budgets, accounts, userId]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Monto'];
      const rows = transactions
        .filter(t => t.userId === userId)
        .map(t => {
          const category = categories.find(c => c.id === t.categoryId)?.name || 'Sin categoría';
          const account = accounts.find(a => a.id === t.accountId)?.name || 'Sin cuenta';
          return [
            format(new Date(t.date), 'dd/MM/yyyy', { locale: es }),
            t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            t.description,
            category,
            account,
            t.amount.toString(),
          ];
        });

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
      console.error(error);
    }
  };

  const periodLabel = periodPreset === 'custom'
    ? `${format(startDate, 'dd MMM yyyy', { locale: es })} - ${format(endDate, 'dd MMM yyyy', { locale: es })}`
    : format(startDate, 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
            <p className="text-muted-foreground">
              Análisis detallado del periodo en {organizationName}
            </p>
          </div>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar Periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Periodo predefinido</Label>
              <Select value={periodPreset} onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mes actual</SelectItem>
                  <SelectItem value="last_month">Mes pasado</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                  <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                  <SelectItem value="current_year">Año actual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setStartDate(new Date(e.target.value));
                  setPeriodPreset('custom');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de fin</Label>
              <Input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setEndDate(new Date(e.target.value));
                  setPeriodPreset('custom');
                }}
              />
            </div>

            <div className="flex items-end">
              <div className="text-sm">
                <p className="font-medium">Periodo seleccionado:</p>
                <p className="text-muted-foreground capitalize">{periodLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportData.transactionCount} transacciones
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrencyAbsolute(reportData.income)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrencyAbsolute(reportData.expenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${reportData.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrencyWithSign(reportData.netBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Ahorro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportData.savingsRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.savingsRate >= 20 ? 'Excelente' : reportData.savingsRate >= 10 ? 'Bueno' : 'Mejorable'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gastos por Categoría
            </CardTitle>
            <CardDescription>{reportData.categoryExpenses.length} categorías</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.categoryExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay gastos registrados en este periodo
              </p>
            ) : (
              <div className="space-y-3">
                {reportData.categoryExpenses.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrencyAbsolute(cat.amount)}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <Progress value={cat.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Presupuesto vs Real
            </CardTitle>
            <CardDescription>{reportData.budgetComparison.length} presupuestos activos</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.budgetComparison.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay presupuestos configurados
              </p>
            ) : (
              <div className="space-y-4">
                {reportData.budgetComparison.map((item) => (
                  <div key={item.budgetId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.categoryName}</span>
                      <Badge
                        variant={
                          item.status === 'exceeded' ? 'destructive' :
                          item.status === 'warning' ? 'default' :
                          'secondary'
                        }
                      >
                        {item.percentage.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Gastado: <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrencyAbsolute(item.spent)}</span></span>
                      <span>Presupuesto: <span className="font-medium">{formatCurrencyAbsolute(item.budgeted)}</span></span>
                    </div>
                    <Progress
                      value={Math.min(item.percentage, 100)}
                      className="h-2"
                    />
                    {item.remaining < 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Excedido por {formatCurrencyAbsolute(item.remaining)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transacciones del Periodo
          </CardTitle>
          <CardDescription>
            {reportData.transactionCount} transacciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.filter(t => t.userId === userId).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay transacciones en este periodo
            </p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(t => t.userId === userId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction) => {
                      const category = categories.find(c => c.id === transaction.categoryId);
                      const account = accounts.find(a => a.id === transaction.accountId);
                      
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-sm">
                            {format(new Date(transaction.date), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {category?.name || 'Sin categoría'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {account?.name || 'Sin cuenta'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'INCOME' ? 'default' : 'secondary'}>
                              {transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            transaction.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.type === 'INCOME' ? '+' : '-'}
                            {formatCurrencyAbsolute(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
