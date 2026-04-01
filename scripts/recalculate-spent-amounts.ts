/**
 * Recalculate Spent Amounts Script
 * 
 * Recalculates spentAmount for all category budgets based on actual transactions
 * This fixes any inconsistencies caused by data sync issues
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = join(process.cwd(), 'cuentas-financieras-0625-firebase-adminsdk-fbsvc-d97375c92b.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ORG_ID = 'QorVu0F4Y73evZrK6BF8';

async function recalculateAllSpentAmounts() {
  console.log('🔄 Iniciando recalculación de montos gastados...\n');
  
  try {
    // Step 0: Debug - Check what organizations exist
    console.log('🔍 DEBUG: Verificando organizaciones en la base de datos...\n');
    
    const allBudgetPeriodsSnapshot = await db.collection('budgetPeriods').limit(10).get();
    console.log(`   Total budget periods encontrados (muestra): ${allBudgetPeriodsSnapshot.docs.length}`);
    
    if (allBudgetPeriodsSnapshot.docs.length > 0) {
      const orgIds = new Set<string>();
      allBudgetPeriodsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.orgId) orgIds.add(data.orgId);
      });
      console.log(`   OrganizationIds encontrados en budgetPeriods:`, Array.from(orgIds));
    }
    
    const allTransactionsSnapshot = await db.collection('transactions').limit(10).get();
    console.log(`   Total transactions encontradas (muestra): ${allTransactionsSnapshot.docs.length}`);
    
    if (allTransactionsSnapshot.docs.length > 0) {
      const orgIds = new Set<string>();
      allTransactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.orgId) orgIds.add(data.orgId);
      });
      console.log(`   OrganizationIds encontrados en transactions:`, Array.from(orgIds));
    }
    
    const allCategoryBudgetsSnapshot = await db.collection('categoryBudgets').limit(10).get();
    console.log(`   Total category budgets encontrados (muestra): ${allCategoryBudgetsSnapshot.docs.length}`);
    
    if (allCategoryBudgetsSnapshot.docs.length > 0) {
      const orgIds = new Set<string>();
      allCategoryBudgetsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.orgId) orgIds.add(data.orgId);
      });
      console.log(`   OrganizationIds encontrados en categoryBudgets:`, Array.from(orgIds));
    }
    
    console.log(`\n   Configurado para usar orgId: ${ORG_ID}\n`);
    console.log('═'.repeat(100) + '\n');
    
    // Step 1: Get all budget periods
    console.log('📂 Paso 1: Obteniendo períodos de presupuesto...');
    const budgetPeriodsSnapshot = await db.collection('budgetPeriods')
      .where('orgId', '==', ORG_ID)
      .get();
    
    console.log(`   Encontrados ${budgetPeriodsSnapshot.docs.length} períodos\n`);
    
    // Step 2: Get all category budgets
    console.log('💰 Paso 2: Obteniendo category budgets...');
    const categoryBudgetsSnapshot = await db.collection('categoryBudgets')
      .where('orgId', '==', ORG_ID)
      .get();
    
    console.log(`   Encontrados ${categoryBudgetsSnapshot.docs.length} category budgets\n`);
    
    // Step 3: Get all transactions
    console.log('📊 Paso 3: Obteniendo todas las transacciones...');
    const transactionsSnapshot = await db.collection('transactions')
      .where('orgId', '==', ORG_ID)
      .get();
    
    console.log(`   Encontradas ${transactionsSnapshot.docs.length} transacciones\n`);
    
    // Build maps for quick lookup
    const budgetPeriodsMap = new Map();
    budgetPeriodsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      budgetPeriodsMap.set(doc.id, {
        id: doc.id,
        startDate: data.startDate?.toDate() || new Date(data.startDate),
        endDate: data.endDate?.toDate() || new Date(data.endDate),
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
        const txDate = tx.date?.toDate() || new Date(tx.date);
        
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
        await db.collection('categoryBudgets').doc(update.id).update({
          spentAmount: update.newSpent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
