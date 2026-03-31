/**
 * Analyze Alondrita Budget Discrepancy
 * 
 * Investigates why the total spent for category "Alondrita" (Vdqwvk7O9vWArvw1u7Do)
 * doesn't match what's shown in the budgets table
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, Timestamp, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ORG_ID = 'JU0yGy4cmIQC0xqBL3lv';
const CATEGORY_ID = 'Vdqwvk7O9vWArvw1u7Do'; // Alondrita
const DISPLAYED_AMOUNT = 17740; // Lo que muestra la tabla según la foto

async function analyzeAlondritaBudget() {
  console.log('🔍 ANÁLISIS DE DISCREPANCIA - CATEGORÍA ALONDRITA\n');
  console.log('═'.repeat(100));
  
  try {
    // Step 1: Verify category exists
    console.log('\n📂 Paso 1: Verificando categoría...\n');
    const categoryDoc = await getDoc(doc(db, 'categories', CATEGORY_ID));
    
    if (!categoryDoc.exists()) {
      console.log('❌ Categoría no encontrada');
      return;
    }
    
    const categoryData = categoryDoc.data();
    console.log(`✅ Categoría encontrada:`);
    console.log(`   ID: ${categoryDoc.id}`);
    console.log(`   Nombre: ${categoryData.name}`);
    console.log(`   Tipo: ${categoryData.type}`);
    console.log(`   Color: ${categoryData.color}`);
    console.log(`   Sistema: ${categoryData.isSystem || false}`);
    
    // Step 2: Get all transactions for this category
    console.log('\n\n💰 Paso 2: Obteniendo TODAS las transacciones de Alondrita...\n');
    const transactionsSnapshot = await getDocs(
      query(
        collection(db, 'transactions'),
        where('orgId', '==', ORG_ID),
        where('categoryId', '==', CATEGORY_ID),
        orderBy('date', 'desc')
      )
    );
    
    console.log(`   Total de transacciones: ${transactionsSnapshot.docs.length}\n`);
    
    if (transactionsSnapshot.docs.length === 0) {
      console.log('⚠️  No hay transacciones para esta categoría');
      return;
    }
    
    // Step 3: Analyze each transaction
    console.log('📊 Paso 3: Análisis detallado de cada transacción:\n');
    console.log('═'.repeat(100));
    
    let totalIncome = 0;
    let totalExpense = 0;
    const transactions: any[] = [];
    
    transactionsSnapshot.docs.forEach((txDoc, index) => {
      const tx = txDoc.data();
      const txDate = tx.date instanceof Timestamp ? tx.date.toDate() : new Date(tx.date);
      
      const transaction = {
        id: txDoc.id,
        type: tx.type,
        amount: tx.amount || 0,
        description: tx.description,
        date: txDate,
        accountId: tx.accountId,
        userId: tx.userId,
        isInstallment: tx.isInstallment || false,
        installmentNumber: tx.installmentNumber,
        totalInstallments: tx.totalInstallments,
        installmentGroupId: tx.installmentGroupId,
        createdAt: tx.createdAt instanceof Timestamp ? tx.createdAt.toDate() : new Date(tx.createdAt),
      };
      
      transactions.push(transaction);
      
      console.log(`\n#${index + 1} - ${transaction.description}`);
      console.log(`   ID: ${transaction.id}`);
      console.log(`   Tipo: ${transaction.type}`);
      console.log(`   Monto: ${transaction.amount.toLocaleString('es-CL')} CLP`);
      console.log(`   Fecha transacción: ${transaction.date.toLocaleDateString('es-CL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`);
      console.log(`   Fecha creación: ${transaction.createdAt.toLocaleDateString('es-CL', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`);
      console.log(`   Account ID: ${transaction.accountId}`);
      console.log(`   User ID: ${transaction.userId}`);
      
      if (transaction.isInstallment) {
        console.log(`   📅 Es cuota: ${transaction.installmentNumber}/${transaction.totalInstallments}`);
        console.log(`   Grupo ID: ${transaction.installmentGroupId}`);
      }
      
      if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount;
      } else if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount;
      }
    });
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n📈 Paso 4: RESUMEN DE TOTALES:\n');
    console.log(`   Total EXPENSE (gastos): ${totalExpense.toLocaleString('es-CL')} CLP`);
    console.log(`   Total INCOME (ingresos): ${totalIncome.toLocaleString('es-CL')} CLP`);
    console.log(`   Neto: ${(totalExpense - totalIncome).toLocaleString('es-CL')} CLP`);
    console.log(`\n   💵 Mostrado en tabla: ${DISPLAYED_AMOUNT.toLocaleString('es-CL')} CLP`);
    console.log(`   💵 Total real (gastos): ${totalExpense.toLocaleString('es-CL')} CLP`);
    console.log(`   ⚠️  DIFERENCIA: ${(totalExpense - DISPLAYED_AMOUNT).toLocaleString('es-CL')} CLP`);
    
    // Step 4: Get budget periods to see which one is active
    console.log('\n\n📅 Paso 5: Analizando períodos de presupuesto...\n');
    const budgetPeriodsSnapshot = await getDocs(
      query(collection(db, 'budgetPeriods'), where('orgId', '==', ORG_ID))
    );
    
    console.log(`   Encontrados ${budgetPeriodsSnapshot.docs.length} períodos\n`);
    
    const now = new Date();
    let activePeriod: any = null;
    
    budgetPeriodsSnapshot.docs.forEach((periodDoc) => {
      const period = periodDoc.data();
      const startDate = period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate);
      const endDate = period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate);
      
      const isActive = now >= startDate && now <= endDate;
      
      console.log(`   ${isActive ? '✅ ACTIVO' : '⏸️  Inactivo'} - ${period.name || 'Sin nombre'}`);
      console.log(`      ID: ${periodDoc.id}`);
      console.log(`      Inicio: ${startDate.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
      console.log(`      Fin: ${endDate.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
      console.log(`      Presupuesto total: ${(period.totalAmount || 0).toLocaleString('es-CL')} CLP\n`);
      
      if (isActive) {
        activePeriod = {
          id: periodDoc.id,
          name: period.name,
          startDate,
          endDate,
          totalAmount: period.totalAmount,
        };
      }
    });
    
    if (!activePeriod) {
      console.log('⚠️  No hay período activo en este momento');
      return;
    }
    
    // Step 5: Filter transactions by active period
    console.log('\n📊 Paso 6: Filtrando transacciones por período ACTIVO...\n');
    console.log(`   Período: ${activePeriod.name}`);
    console.log(`   Inicio: ${activePeriod.startDate.toISOString()}`);
    console.log(`   Fin: ${activePeriod.endDate.toISOString()}\n`);
    
    const transactionsInPeriod = transactions.filter(tx => {
      const inPeriod = tx.date >= activePeriod.startDate && tx.date <= activePeriod.endDate;
      return inPeriod && tx.type === 'EXPENSE';
    });
    
    console.log(`   ✅ Transacciones en período: ${transactionsInPeriod.length}`);
    
    const totalInPeriod = transactionsInPeriod.reduce((sum, tx) => sum + tx.amount, 0);
    console.log(`   💵 Total en período: ${totalInPeriod.toLocaleString('es-CL')} CLP`);
    
    console.log('\n   Detalle de transacciones EN el período:');
    transactionsInPeriod.forEach((tx, i) => {
      console.log(`      ${i + 1}. ${tx.description}: ${tx.amount.toLocaleString('es-CL')} CLP (${tx.date.toLocaleDateString('es-CL')})`);
    });
    
    const transactionsOutsidePeriod = transactions.filter(tx => {
      const inPeriod = tx.date >= activePeriod.startDate && tx.date <= activePeriod.endDate;
      return !inPeriod && tx.type === 'EXPENSE';
    });
    
    if (transactionsOutsidePeriod.length > 0) {
      console.log('\n   ⚠️  Transacciones FUERA del período (no contabilizadas):');
      transactionsOutsidePeriod.forEach((tx, i) => {
        console.log(`      ${i + 1}. ${tx.description}: ${tx.amount.toLocaleString('es-CL')} CLP (${tx.date.toLocaleDateString('es-CL')})`);
      });
    }
    
    // Step 6: Check category budget
    console.log('\n\n💼 Paso 7: Verificando category budget...\n');
    const categoryBudgetsSnapshot = await getDocs(
      query(
        collection(db, 'categoryBudgets'),
        where('orgId', '==', ORG_ID),
        where('budgetPeriodId', '==', activePeriod.id),
        where('categoryId', '==', CATEGORY_ID)
      )
    );
    
    if (categoryBudgetsSnapshot.empty) {
      console.log('   ⚠️  No existe category budget para Alondrita en el período activo');
    } else {
      const categoryBudgetDoc = categoryBudgetsSnapshot.docs[0];
      const categoryBudget = categoryBudgetDoc.data();
      
      console.log(`   ✅ Category Budget encontrado:`);
      console.log(`      ID: ${categoryBudgetDoc.id}`);
      console.log(`      Porcentaje asignado: ${categoryBudget.percentage}%`);
      console.log(`      Monto asignado: ${categoryBudget.allocatedAmount.toLocaleString('es-CL')} CLP`);
      console.log(`      Monto gastado (spentAmount): ${categoryBudget.spentAmount.toLocaleString('es-CL')} CLP`);
      console.log(`      Restante: ${(categoryBudget.allocatedAmount - categoryBudget.spentAmount).toLocaleString('es-CL')} CLP`);
      
      console.log('\n   🔎 ANÁLISIS DE DISCREPANCIA:');
      console.log(`      Monto en categoryBudget.spentAmount: ${categoryBudget.spentAmount.toLocaleString('es-CL')} CLP`);
      console.log(`      Total calculado de transacciones: ${totalInPeriod.toLocaleString('es-CL')} CLP`);
      console.log(`      Diferencia: ${Math.abs(categoryBudget.spentAmount - totalInPeriod).toLocaleString('es-CL')} CLP`);
      
      if (Math.abs(categoryBudget.spentAmount - totalInPeriod) > 1) {
        console.log('\n      ❌ HAY UNA DISCREPANCIA entre spentAmount y el total real');
        console.log('      El campo spentAmount NO está sincronizado con las transacciones reales');
      } else {
        console.log('\n      ✅ El spentAmount está correctamente sincronizado');
      }
    }
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n✅ Análisis completado\n');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Run the analysis
analyzeAlondritaBudget()
  .then(() => {
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
