/**
 * Recalculate Spent Amounts Script
 * 
 * Recalculates spentAmount for all category budgets based on actual transactions
 * This fixes any inconsistencies caused by data sync issues
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';

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

async function recalculateAllSpentAmounts() {
  console.log('🔄 Iniciando recalculación de montos gastados...\n');
  
  try {
    // Step 1: Get all budget periods
    console.log('📂 Paso 1: Obteniendo períodos de presupuesto...');
    const budgetPeriodsSnapshot = await getDocs(
      query(collection(db, 'budgetPeriods'), where('orgId', '==', ORG_ID))
    );
    
    console.log(`   Encontrados ${budgetPeriodsSnapshot.docs.length} períodos\n`);
    
    // Step 2: Get all category budgets
    console.log('💰 Paso 2: Obteniendo category budgets...');
    const categoryBudgetsSnapshot = await getDocs(
      query(collection(db, 'categoryBudgets'), where('orgId', '==', ORG_ID))
    );
    
    console.log(`   Encontrados ${categoryBudgetsSnapshot.docs.length} category budgets\n`);
    
    // Step 3: Get all transactions
    console.log('📊 Paso 3: Obteniendo todas las transacciones...');
    const transactionsSnapshot = await getDocs(
      query(collection(db, 'transactions'), where('orgId', '==', ORG_ID))
    );
    
    console.log(`   Encontradas ${transactionsSnapshot.docs.length} transacciones\n`);
    
    // Build maps for quick lookup
    const budgetPeriodsMap = new Map();
    budgetPeriodsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      budgetPeriodsMap.set(doc.id, {
        id: doc.id,
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
        name: data.name,
      });
    });
    
    const categoryBudgetsMap = new Map();
    categoryBudgetsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      categoryBudgetsMap.set(doc.id, {
        id: doc.id,
        budgetPeriodId: data.budgetPeriodId,
        categoryId: data.categoryId,
        currentSpent: data.spentAmount || 0,
        allocatedAmount: data.allocatedAmount || 0,
      });
    });
    
    // Step 4: Calculate spent amounts for each category budget
    console.log('🧮 Paso 4: Calculando montos gastados...\n');
    console.log('═'.repeat(100));
    
    const updates: Array<{ id: string; oldSpent: number; newSpent: number; categoryId: string; periodName: string }> = [];
    
    for (const [categoryBudgetId, categoryBudget] of categoryBudgetsMap) {
      const budgetPeriod = budgetPeriodsMap.get(categoryBudget.budgetPeriodId);
      if (!budgetPeriod) {
        console.log(`⚠️  Budget period no encontrado para category budget ${categoryBudgetId}`);
        continue;
      }
      
      // Filter transactions for this category and period
      const relevantTransactions = transactionsSnapshot.docs.filter(txDoc => {
        const tx = txDoc.data();
        const txDate = tx.date instanceof Timestamp ? tx.date.toDate() : new Date(tx.date);
        
        // Use >= and <= to INCLUDE boundary dates
        const isInPeriod = txDate >= budgetPeriod.startDate && txDate <= budgetPeriod.endDate;
        const isCorrectCategory = tx.categoryId === categoryBudget.categoryId;
        const isExpense = tx.type === 'EXPENSE';
        
        return isInPeriod && isCorrectCategory && isExpense;
      });
      
      // Calculate total spent
      const calculatedSpent = relevantTransactions.reduce((sum, txDoc) => {
        const tx = txDoc.data();
        return sum + (tx.amount || 0);
      }, 0);
      
      if (calculatedSpent !== categoryBudget.currentSpent) {
        updates.push({
          id: categoryBudgetId,
          oldSpent: categoryBudget.currentSpent,
          newSpent: calculatedSpent,
          categoryId: categoryBudget.categoryId,
          periodName: budgetPeriod.name || 'Sin nombre',
        });
      }
    }
    
    console.log(`\n📝 Se encontraron ${updates.length} category budgets con diferencias\n`);
    
    if (updates.length === 0) {
      console.log('✅ Todos los montos están correctos. No se requieren actualizaciones.');
      return;
    }
    
    // Show differences
    console.log('Diferencias encontradas:\n');
    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.periodName} - Categoría ${update.categoryId}`);
      console.log(`   Monto actual: ${update.oldSpent.toLocaleString('es-CL')} CLP`);
      console.log(`   Monto correcto: ${update.newSpent.toLocaleString('es-CL')} CLP`);
      console.log(`   Diferencia: ${(update.newSpent - update.oldSpent).toLocaleString('es-CL')} CLP\n`);
    });
    
    // Step 5: Update Firestore
    console.log('💾 Paso 5: Actualizando Firestore...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      try {
        const docRef = doc(db, 'categoryBudgets', update.id);
        await updateDoc(docRef, {
          spentAmount: update.newSpent,
          updatedAt: new Date(),
        });
        successCount++;
        console.log(`✅ Actualizado ${update.periodName} - ${update.categoryId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error actualizando ${update.id}:`, error);
      }
    }
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n📊 RESUMEN:\n');
    console.log(`   Total de actualizaciones: ${updates.length}`);
    console.log(`   ✅ Exitosas: ${successCount}`);
    console.log(`   ❌ Fallidas: ${errorCount}`);
    console.log('\n✅ Recalculación completada\n');
    
  } catch (error) {
    console.error('❌ Error durante la recalculación:', error);
  }
}

// Run the recalculation
recalculateAllSpentAmounts()
  .then(() => {
    console.log('Proceso terminado. Presiona Ctrl+C para salir.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
