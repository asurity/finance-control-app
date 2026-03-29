'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function GenerateMockupPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const generateMockupData = async () => {
    if (!user) {
      addLog('❌ No hay usuario autenticado');
      return;
    }

    setStatus('generating');
    setLogs([]);
    addLog('🚀 Iniciando generación de datos mockup...');
    
    const orgId = `${user.id}-personal`;
    const orgPath = `organizations/${orgId}`;

    try {
      // 1. Crear categorías
      addLog('\n📁 Creando categorías...');
      const categories = [
        // Gastos
        { name: 'Alimentación', type: 'EXPENSE', icon: '🍔', color: '#ef4444' },
        { name: 'Transporte', type: 'EXPENSE', icon: '🚗', color: '#f97316' },
        { name: 'Vivienda', type: 'EXPENSE', icon: '🏠', color: '#eab308' },
        { name: 'Entretenimiento', type: 'EXPENSE', icon: '🎮', color: '#8b5cf6' },
        { name: 'Salud', type: 'EXPENSE', icon: '⚕️', color: '#ec4899' },
        { name: 'Educación', type: 'EXPENSE', icon: '📚', color: '#06b6d4' },
        { name: 'Servicios', type: 'EXPENSE', icon: '💡', color: '#10b981' },
        // Ingresos
        { name: 'Salario', type: 'INCOME', icon: '💰', color: '#22c55e' },
        { name: 'Freelance', type: 'INCOME', icon: '💻', color: '#3b82f6' },
        { name: 'Inversiones', type: 'INCOME', icon: '📈', color: '#14b8a6' },
      ];

      const categoryIds: Record<string, string> = {};
      for (const cat of categories) {
        const ref = await addDoc(collection(db, `${orgPath}/categories`), cat);
        categoryIds[cat.name] = ref.id;
        addLog(`  ✅ ${cat.name}`);
      }

      // 2. Crear cuentas
      addLog('\n💳 Creando cuentas...');
      const accounts = [
        { name: 'Cuenta Corriente', type: 'CHECKING', balance: 1500000, currency: 'CLP', isActive: true },
        { name: 'Cuenta de Ahorro', type: 'SAVINGS', balance: 3000000, currency: 'CLP', isActive: true },
        { name: 'Tarjeta de Crédito', type: 'CREDIT_CARD', balance: -500000, currency: 'CLP', isActive: true },
        { name: 'Efectivo', type: 'CASH', balance: 50000, currency: 'CLP', isActive: true },
      ];

      const accountIds: string[] = [];
      for (const acc of accounts) {
        const ref = await addDoc(collection(db, `${orgPath}/accounts`), acc);
        accountIds.push(ref.id);
        addLog(`  ✅ ${acc.name}: ${acc.balance.toLocaleString('es-CL')}`);
      }

      // 3. Generar transacciones de los últimos 3 meses
      addLog('\n💸 Generando transacciones...');
      const today = new Date();
      const transactions: any[] = [];

      // Generar transacciones aleatorias
      const expenseCategories = ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Servicios'];
      const incomeCategories = ['Salario', 'Freelance', 'Inversiones'];

      const expenseDescriptions: Record<string, string[]> = {
        'Alimentación': ['Supermercado', 'Restaurante', 'Café', 'Delivery comida', 'Panadería'],
        'Transporte': ['Combustible', 'Uber', 'Metro', 'Peaje', 'Estacionamiento'],
        'Vivienda': ['Arriendo', 'Luz', 'Agua', 'Gas', 'Internet'],
        'Entretenimiento': ['Netflix', 'Spotify', 'Cine', 'Concierto', 'Videojuegos'],
        'Salud': ['Farmacia', 'Médico', 'Gimnasio', 'Seguro de salud'],
        'Educación': ['Curso online', 'Libros', 'Universidad', 'Material escolar'],
        'Servicios': ['Teléfono', 'Streaming', 'Suscripción', 'Seguro'],
      };

      const incomeDescriptions: Record<string, string[]> = {
        'Salario': ['Sueldo mensual', 'Bonificación', 'Aguinaldo'],
        'Freelance': ['Proyecto web', 'Consultoría', 'Desarrollo app'],
        'Inversiones': ['Dividendos', 'Intereses', 'Venta de acciones'],
      };

      // Generar 100 transacciones aleatorias
      for (let i = 0; i < 100; i++) {
        const isExpense = Math.random() > 0.3; // 70% gastos, 30% ingresos
        const daysAgo = Math.floor(Math.random() * 90); // Últimos 90 días
        const transactionDate = new Date(today);
        transactionDate.setDate(transactionDate.getDate() - daysAgo);

        if (isExpense) {
          const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
          const descriptions = expenseDescriptions[category];
          const description = descriptions[Math.floor(Math.random() * descriptions.length)];
          const amount = Math.floor(Math.random() * 150000) + 5000; // Entre 5k y 155k

          transactions.push({
            description,
            amount,
            type: 'EXPENSE',
            date: Timestamp.fromDate(transactionDate),
            accountId: accountIds[Math.floor(Math.random() * accountIds.length)],
            categoryId: categoryIds[category],
            userId: user.id,
            tags: [],
          });
        } else {
          const category = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
          const descriptions = incomeDescriptions[category];
          const description = descriptions[Math.floor(Math.random() * descriptions.length)];
          const amount = category === 'Salario' 
            ? Math.floor(Math.random() * 500000) + 1500000 // Salario: 1.5M - 2M
            : Math.floor(Math.random() * 500000) + 200000; // Otros: 200k - 700k

          transactions.push({
            description,
            amount,
            type: 'INCOME',
            date: Timestamp.fromDate(transactionDate),
            accountId: accountIds[0], // Siempre a cuenta corriente
            categoryId: categoryIds[category],
            userId: user.id,
            tags: [],
          });
        }
      }

      // Ordenar por fecha
      transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());

      // Insertar en Firestore
      let count = 0;
      for (const transaction of transactions) {
        await addDoc(collection(db, `${orgPath}/transactions`), transaction);
        count++;
        if (count % 20 === 0) {
          addLog(`  ⏳ ${count} transacciones creadas...`);
        }
      }
      addLog(`  ✅ Total: ${count} transacciones creadas`);

      // 4. Crear presupuestos
      addLog('\n🎯 Creando presupuestos...');
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budgets = [
        { name: 'Presupuesto Alimentación', amount: 300000, period: 'MONTHLY', categoryId: categoryIds['Alimentación'] },
        { name: 'Presupuesto Transporte', amount: 150000, period: 'MONTHLY', categoryId: categoryIds['Transporte'] },
        { name: 'Presupuesto Entretenimiento', amount: 100000, period: 'MONTHLY', categoryId: categoryIds['Entretenimiento'] },
      ];

      for (const budget of budgets) {
        await addDoc(collection(db, `${orgPath}/budgets`), {
          ...budget,
          startDate: Timestamp.fromDate(startOfMonth),
          endDate: Timestamp.fromDate(endOfMonth),
        });
        addLog(`  ✅ ${budget.name}: ${budget.amount.toLocaleString('es-CL')}`);
      }

      addLog('\n✅ ¡Datos mockup generados exitosamente!');
      addLog(`\n📊 Resumen:`);
      addLog(`  • ${categories.length} categorías`);
      addLog(`  • ${accounts.length} cuentas`);
      addLog(`  • ${transactions.length} transacciones`);
      addLog(`  • ${budgets.length} presupuestos`);
      addLog(`\n🎉 Puedes ir al dashboard para ver los datos`);

      setStatus('success');
    } catch (error: any) {
      addLog(`\n❌ Error: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🎲 Generar Datos Mockup</CardTitle>
          <CardDescription>
            Genera datos de ejemplo para probar el dashboard (categorías, cuentas, transacciones y presupuestos)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Debes iniciar sesión primero</span>
            </div>
          ) : (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm"><strong>Usuario:</strong> {user.email}</p>
                <p className="text-sm"><strong>Organización:</strong> {user.id}-personal</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-semibold mb-1">⚠️ Advertencia</p>
                    <p>Esto generará:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>10 categorías</li>
                      <li>4 cuentas bancarias</li>
                      <li>100 transacciones aleatorias (últimos 3 meses)</li>
                      <li>3 presupuestos mensuales</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateMockupData} 
                disabled={status === 'generating'}
                className="w-full"
                size="lg"
              >
                {status === 'generating' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando datos...
                  </>
                ) : (
                  '🎲 Generar Datos Mockup'
                )}
              </Button>

              {logs.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Progreso:</h3>
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">¡Datos generados exitosamente!</h3>
                  </div>
                  <p className="text-sm text-green-800">
                    Ahora puedes ir al <a href="/dashboard" className="underline font-medium">Dashboard</a> para ver los datos en acción.
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Error al generar datos</h3>
                  </div>
                  <p className="mt-2 text-sm text-red-800">Revisa los logs arriba para más detalles</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
