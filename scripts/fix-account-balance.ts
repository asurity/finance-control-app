/**
 * Fix All Account Balances Script
 * 
 * Corrects the balance of ALL accounts based on their transaction history
 * NOTA: Asume que el saldo inicial de cada cuenta es su campo initialBalance o 0
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

async function fixAllAccountBalances() {
  console.log('🔧 Corrigiendo balances de TODAS las cuentas...\n');
  console.log('═'.repeat(100) + '\n');
  
  try {
    // Step 1: Get all accounts from organization
    console.log('📂 Paso 1: Obteniendo todas las cuentas de la organización...\n');
    const accountsSnapshot = await db.collection('accounts')
      .where('orgId', '==', ORG_ID)
      .get();
    
    console.log(`   Cuentas encontradas: ${accountsSnapshot.docs.length}\n`);
    console.log('═'.repeat(100) + '\n');
    
    // Step 2: Get all transactions
    console.log('📊 Paso 2: Obteniendo todas las transacciones...\n');
    const transactionsSnapshot = await db.collection('transactions')
      .where('orgId', '==', ORG_ID)
      .orderBy('date', 'asc')
      .get();
    
    console.log(`   Transacciones encontradas: ${transactionsSnapshot.docs.length}\n`);
    console.log('═'.repeat(100) + '\n');
    
    // Step 3: Group transactions by accountId
    const transactionsByAccount = new Map<string, any[]>();
    
    transactionsSnapshot.docs.forEach(txDoc => {
      const tx = txDoc.data();
      const accountId = tx.accountId;
      
      if (!accountId) return;
      
      if (!transactionsByAccount.has(accountId)) {
        transactionsByAccount.set(accountId, []);
      }
      
      transactionsByAccount.get(accountId)!.push({
        id: txDoc.id,
        ...tx,
      });
    });
    
    console.log('🧮 Paso 3: Verificando cada cuenta...\n\n');
    
    const accountsToFix: Array<{
      id: string;
      name: string;
      type: string;
      currentBalance: number;
      calculatedBalance: number;
      difference: number;
      transactionCount: number;
      creditLimit?: number;
    }> = [];
    
    // Step 4: Process each account
    for (const accountDoc of accountsSnapshot.docs) {
      const accountId = accountDoc.id;
      const accountData = accountDoc.data();
      const accountName = accountData?.name || 'Sin nombre';
      const accountType = accountData?.type || 'UNKNOWN';
      const currentBalance = accountData?.balance || 0;
      
      // Get initial balance (if account has it) or use 0
      const initialBalance = accountData?.initialBalance || 0;
      
      // Get transactions for this account
      const accountTransactions = transactionsByAccount.get(accountId) || [];
      
      // Calculate balance from transactions
      let calculatedBalance = initialBalance;
      
      accountTransactions.forEach(tx => {
        const amount = tx.amount || 0;
        const type = tx.type;
        
        if (type === 'EXPENSE') {
          calculatedBalance -= amount;
        } else if (type === 'INCOME' || type === 'PAYMENT') {
          calculatedBalance += amount;
        }
      });
      
      const difference = calculatedBalance - currentBalance;
      
      console.log(`📋 ${accountName} (${accountType})`);
      console.log(`   ID: ${accountId}`);
      console.log(`   Saldo inicial: ${initialBalance.toLocaleString('es-CL')} CLP`);
      console.log(`   Transacciones: ${accountTransactions.length}`);
      console.log(`   Balance actual (BD): ${currentBalance.toLocaleString('es-CL')} CLP`);
      console.log(`   Balance calculado: ${calculatedBalance.toLocaleString('es-CL')} CLP`);
      console.log(`   Diferencia: ${Math.abs(difference).toLocaleString('es-CL')} CLP ${difference === 0 ? '✅' : '❌'}\n`);
      
      if (difference !== 0) {
        accountsToFix.push({
          id: accountId,
          name: accountName,
          type: accountType,
          currentBalance,
          calculatedBalance,
          difference,
          transactionCount: accountTransactions.length,
          creditLimit: accountData?.creditLimit,
        });
      }
    }
    
    console.log('═'.repeat(100) + '\n');
    
    // Step 5: Summary
    console.log('📊 RESUMEN:\n');
    console.log(`   Total de cuentas: ${accountsSnapshot.docs.length}`);
    console.log(`   Cuentas con balance correcto: ${accountsSnapshot.docs.length - accountsToFix.length} ✅`);
    console.log(`   Cuentas con balance incorrecto: ${accountsToFix.length} ❌\n`);
    
    if (accountsToFix.length === 0) {
      console.log('✅ Todos los balances están correctos. No se requiere corrección.\n');
      return;
    }
    
    console.log('═'.repeat(100) + '\n');
    console.log('🔧 CUENTAS A CORREGIR:\n');
    
    accountsToFix.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   Balance actual: ${account.currentBalance.toLocaleString('es-CL')} CLP`);
      console.log(`   Balance correcto: ${account.calculatedBalance.toLocaleString('es-CL')} CLP`);
      console.log(`   Ajuste necesario: ${account.difference.toLocaleString('es-CL')} CLP`);
      console.log(`   Transacciones procesadas: ${account.transactionCount}\n`);
    });
    
    console.log('═'.repeat(100) + '\n');
    
    // Step 6: Update all accounts
    console.log('💾 Paso 4: Actualizando balances en Firestore...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const account of accountsToFix) {
      try {
        const updateData: any = {
          balance: account.calculatedBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Update available credit for credit cards
        if (account.type === 'CREDIT_CARD' && account.creditLimit) {
          const newAvailableCredit = account.creditLimit + account.calculatedBalance;
          updateData.availableCredit = newAvailableCredit;
        }
        
        await db.collection('accounts').doc(account.id).update(updateData);
        
        successCount++;
        console.log(`✅ [${successCount}/${accountsToFix.length}] ${account.name} - Balance actualizado`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error actualizando ${account.name}:`, error);
      }
    }
    
    console.log('\n' + '═'.repeat(100) + '\n');
    console.log('📊 RESULTADO FINAL:\n');
    console.log(`   Total de cuentas corregidas: ${successCount}`);
    console.log(`   Errores: ${errorCount}\n`);
    console.log('✅ Proceso completado\n');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
}

// Run the fix
fixAllAccountBalances()
  .then(() => {
    console.log('Proceso terminado. Presiona Ctrl+C para salir.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
