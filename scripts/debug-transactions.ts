/**
 * Debug Script: Analyze Transporte Category Transactions
 * 
 * This script helps diagnose why transaction totals might be incorrect
 * by fetching all transactions and analyzing them in detail.
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'asurity-finance-firebase-adminsdk.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  console.error('Please make sure the Firebase service account key exists.');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8')
) as ServiceAccount;

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Your organization ID
const ORG_ID = 'JU0yGy4cmIQC0xqBL3lv';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: Date;
  categoryId: string;
  userId: string;
  accountId: string;
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
  createdAt?: Date;
}

async function analyzeTransactions() {
  console.log('🔍 Analizando transacciones de la categoría "Transporte"...\n');
  
  try {
    // Step 1: Get all categories to find "Transporte"
    console.log('📂 Paso 1: Buscando la categoría "Transporte"...');
    const categoriesSnapshot = await db
      .collection('categories')
      .where('orgId', '==', ORG_ID)
      .get();
    
    const transporteCategory = categoriesSnapshot.docs.find(
      (doc: any) => doc.data().name.toLowerCase() === 'transporte'
    );
    
    if (!transporteCategory) {
      console.log('❌ No se encontró la categoría "Transporte"');
      console.log('\n📋 Categorías disponibles:');
      categoriesSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        console.log(`   - ${data.name} (ID: ${doc.id}, Tipo: ${data.type})`);
      });
      return;
    }
    
    const transporteCategoryId = transporteCategory.id;
    const transporteData = transporteCategory.data();
    console.log(`✅ Categoría encontrada: ${transporteData.name}`);
    console.log(`   ID: ${transporteCategoryId}`);
    console.log(`   Tipo: ${transporteData.type}`);
    console.log(`   Color: ${transporteData.color}\n`);
    
    // Step 2: Get all transactions for this category
    console.log('💰 Paso 2: Obteniendo TODAS las transacciones de "Transporte"...');
    const transactionsSnapshot = await db
      .collection('transactions')
      .where('orgId', '==', ORG_ID)
      .where('categoryId', '==', transporteCategoryId)
      .orderBy('date', 'desc')
      .get();
    
    console.log(`   Total de transacciones encontradas: ${transactionsSnapshot.docs.length}\n`);
    
    if (transactionsSnapshot.docs.length === 0) {
      console.log('❌ No se encontraron transacciones para esta categoría');
      return;
    }
    
    // Step 3: Analyze each transaction
    console.log('📊 Paso 3: Analizando cada transacción en detalle:\n');
    console.log('═'.repeat(100));
    
    let totalAmount = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    const transactions: Transaction[] = [];
    
    transactionsSnapshot.docs.forEach((doc: any, index: number) => {
      const data = doc.data();
      const transaction: Transaction = {
        id: doc.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        categoryId: data.categoryId,
        userId: data.userId,
        accountId: data.accountId,
        isInstallment: data.isInstallment,
        installmentNumber: data.installmentNumber,
        totalInstallments: data.totalInstallments,
        installmentGroupId: data.installmentGroupId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
      };
      
      transactions.push(transaction);
      
      console.log(`\n#${index + 1}`);
      console.log(`   ID: ${transaction.id}`);
      console.log(`   Descripción: ${transaction.description}`);
      console.log(`   Tipo: ${transaction.type}`);
      console.log(`   Monto: ${transaction.amount.toLocaleString('es-CL')} CLP`);
      console.log(`   Fecha: ${transaction.date.toLocaleDateString('es-CL')}`);
      console.log(`   Usuario: ${transaction.userId}`);
      
      if (transaction.isInstallment) {
        console.log(`   📅 Es cuota: ${transaction.installmentNumber}/${transaction.totalInstallments}`);
        console.log(`   Grupo: ${transaction.installmentGroupId}`);
      }
      
      if (transaction.type === 'EXPENSE') {
        totalAmount += transaction.amount;
        expenseCount++;
      } else {
        incomeCount++;
      }
    });
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n📈 RESUMEN TOTAL:\n');
    console.log(`   Total de transacciones: ${transactions.length}`);
    console.log(`   - Gastos (EXPENSE): ${expenseCount}`);
    console.log(`   - Ingresos (INCOME): ${incomeCount}`);
    console.log(`\n   💵 SUMA TOTAL DE GASTOS: ${totalAmount.toLocaleString('es-CL')} CLP`);
    
    // Step 4: Analyze by month
    console.log('\n\n📅 Paso 4: Desglose por mes:\n');
    const byMonth = new Map<string, { count: number; amount: number; transactions: Transaction[] }>();
    
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        const existing = byMonth.get(monthKey) || { count: 0, amount: 0, transactions: [] };
        existing.count++;
        existing.amount += t.amount;
        existing.transactions.push(t);
        byMonth.set(monthKey, existing);
      });
    
    const sortedMonths = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    
    sortedMonths.forEach(([month, data]) => {
      console.log(`   ${month}: ${data.amount.toLocaleString('es-CL')} CLP (${data.count} transacciones)`);
    });
    
    // Step 5: Check current month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthData = byMonth.get(currentMonthKey);
    
    console.log('\n\n🗓️  Paso 5: Transacciones del mes actual (' + currentMonthKey + '):\n');
    if (currentMonthData) {
      console.log(`   Total del mes: ${currentMonthData.amount.toLocaleString('es-CL')} CLP`);
      console.log(`   Número de transacciones: ${currentMonthData.count}`);
      console.log('\n   Detalles:');
      currentMonthData.transactions.forEach((t, i) => {
        console.log(`      ${i + 1}. ${t.description}: ${t.amount.toLocaleString('es-CL')} CLP (${t.date.toLocaleDateString('es-CL')})`);
      });
    } else {
      console.log('   ⚠️  No hay transacciones de "Transporte" en el mes actual');
    }
    
    // Step 6: Check for installments
    console.log('\n\n💳 Paso 6: Análisis de cuotas/installments:\n');
    const installmentGroups = new Map<string, Transaction[]>();
    transactions.forEach(t => {
      if (t.isInstallment && t.installmentGroupId) {
        const group = installmentGroups.get(t.installmentGroupId) || [];
        group.push(t);
        installmentGroups.set(t.installmentGroupId, group);
      }
    });
    
    if (installmentGroups.size > 0) {
      console.log(`   Se encontraron ${installmentGroups.size} grupos de cuotas:\n`);
      let groupIndex = 1;
      installmentGroups.forEach((group, groupId) => {
        const totalGroupAmount = group.reduce((sum, t) => sum + t.amount, 0);
        console.log(`   Grupo ${groupIndex} (${groupId}):`);
        console.log(`      Transacción: ${group[0].description.replace(/\s*\(Cuota.*\)/, '')}`);
        console.log(`      Cuotas: ${group.length} de ${group[0].totalInstallments || 'N/A'}`);
        console.log(`      Monto por cuota: ${group[0].amount.toLocaleString('es-CL')} CLP`);
        console.log(`      Total acumulado de cuotas mostradas: ${totalGroupAmount.toLocaleString('es-CL')} CLP`);
        if (group[0].totalInstallments) {
          const expectedTotal = group[0].amount * group[0].totalInstallments;
          console.log(`      Total esperado del crédito: ${expectedTotal.toLocaleString('es-CL')} CLP`);
        }
        console.log('');
        groupIndex++;
      });
    } else {
      console.log('   No hay transacciones con cuotas');
    }
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n✅ Análisis completado\n');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Run the analysis
analyzeTransactions()
  .then(() => {
    console.log('Presiona Ctrl+C para salir');
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
