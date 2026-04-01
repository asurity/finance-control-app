/**
 * Verify Credit Card Balance Script
 * 
 * Verifies the balance calculation for a specific credit card
 * by checking all transactions and comparing with the current balance
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
const ACCOUNT_ID = 'IjUIHQgtnvC8EmUmMwbT'; // Account ID (no creditCardId)
const INITIAL_BALANCE = -391737; // CLP
const EXPECTED_BALANCE = -816230; // CLP según tus cálculos
const CURRENT_BALANCE = -702278; // CLP actual en BD

async function verifyCreditCardBalance() {
  console.log('🔍 Verificando balance de tarjeta de crédito...\n');
  console.log('═'.repeat(100));
  console.log('\n📋 INFORMACIÓN INICIAL:\n');
  console.log(`   Organization ID: ${ORG_ID}`);
  console.log(`   Account ID: ${ACCOUNT_ID}`);
  console.log(`   Saldo Inicial: ${INITIAL_BALANCE.toLocaleString('es-CL')} CLP`);
  console.log(`   Saldo Actual (BD): ${CURRENT_BALANCE.toLocaleString('es-CL')} CLP`);
  console.log(`   Saldo Esperado (tus cálculos): ${EXPECTED_BALANCE.toLocaleString('es-CL')} CLP`);
  console.log(`   Diferencia: ${(CURRENT_BALANCE - EXPECTED_BALANCE).toLocaleString('es-CL')} CLP\n`);
  console.log('═'.repeat(100) + '\n');
  
  try {
    // Step 1: Get the account from Firestore
    console.log('💳 Paso 1: Obteniendo información de la cuenta...\n');
    const accountDoc = await db.collection('accounts').doc(ACCOUNT_ID).get();
    
    if (!accountDoc.exists) {
      console.log('❌ ERROR: La cuenta no existe en la base de datos');
      return;
    }
    
    const accountData = accountDoc.data();
    console.log('   Datos de la cuenta:');
    console.log(`   - Nombre: ${accountData?.name}`);
    console.log(`   - Tipo: ${accountData?.type}`);
    console.log(`   - Balance actual en BD: ${accountData?.balance?.toLocaleString('es-CL')} CLP`);
    console.log(`   - Límite de crédito: ${accountData?.creditLimit?.toLocaleString('es-CL')} CLP`);
    console.log(`   - Crédito disponible: ${accountData?.availableCredit?.toLocaleString('es-CL')} CLP`);
    console.log(`   - OrgId: ${accountData?.orgId}\n`);
    
    // Step 2: Get all transactions for this credit card
    console.log('📊 Paso 2: Obteniendo todas las transacciones de la organización...\n');
    const transactionsSnapshot = await db.collection('transactions')
      .where('orgId', '==', ORG_ID)
      .orderBy('date', 'asc')
      .get();
    
    console.log(`   Total transacciones en la organización: ${transactionsSnapshot.docs.length}\n`);
    
    // Filter transactions for this account
    const accountTransactions = transactionsSnapshot.docs.filter(doc => {
      const tx = doc.data();
      return tx.accountId === ACCOUNT_ID;
    });
    
    console.log(`   Transacciones asociadas a esta cuenta: ${accountTransactions.length}\n`);
    console.log('═'.repeat(100) + '\n');
    
    // Step 3: Calculate balance step by step
    console.log('🧮 Paso 3: Calculando balance paso a paso...\n');
    
    let calculatedBalance = INITIAL_BALANCE;
    console.log(`   SALDO INICIAL: ${calculatedBalance.toLocaleString('es-CL')} CLP\n`);
    
    console.log('   TRANSACCIONES:\n');
    
    accountTransactions.forEach((txDoc, index) => {
      const tx = txDoc.data();
      const date = tx.date?.toDate() || new Date(tx.date);
      const amount = tx.amount || 0;
      const type = tx.type;
      
      // For credit cards:
      // - EXPENSE: decrease balance (more negative) -> subtract amount
      // - INCOME/PAYMENT: increase balance (less negative) -> add amount
      
      let balanceChange = 0;
      if (type === 'EXPENSE') {
        balanceChange = -amount; // Gasto reduce el balance (más negativo)
      } else if (type === 'INCOME' || type === 'PAYMENT') {
        balanceChange = amount; // Pago aumenta el balance (menos negativo)
      }
      
      const previousBalance = calculatedBalance;
      calculatedBalance += balanceChange;
      
      console.log(`   ${index + 1}. [${date.toISOString().split('T')[0]}] ${type}`);
      console.log(`      Monto: ${amount.toLocaleString('es-CL')} CLP`);
      console.log(`      Cambio: ${balanceChange.toLocaleString('es-CL')} CLP`);
      console.log(`      Balance: ${previousBalance.toLocaleString('es-CL')} → ${calculatedBalance.toLocaleString('es-CL')} CLP`);
      console.log(`      Descripción: ${tx.description || 'Sin descripción'}`);
      console.log(`      ID: ${txDoc.id}\n`);
    });
    
    console.log('═'.repeat(100) + '\n');
    
    // Step 4: Compare results
    console.log('📊 Paso 4: RESUMEN Y COMPARACIÓN\n');
    console.log('   BALANCES:\n');
    console.log(`   Saldo Inicial:              ${INITIAL_BALANCE.toLocaleString('es-CL')} CLP`);
    console.log(`   Total de transacciones:     ${accountTransactions.length}`);
    console.log(`   Saldo Calculado (script):   ${calculatedBalance.toLocaleString('es-CL')} CLP`);
    console.log(`   Saldo Actual (BD):          ${accountData?.balance?.toLocaleString('es-CL')} CLP`);
    console.log(`   Saldo Esperado (tus cálc):  ${EXPECTED_BALANCE.toLocaleString('es-CL')} CLP\n`);
    
    console.log('   DIFERENCIAS:\n');
    const diffCalculatedVsActual = calculatedBalance - (accountData?.balance || 0);
    const diffCalculatedVsExpected = calculatedBalance - EXPECTED_BALANCE;
    const diffActualVsExpected = (accountData?.balance || 0) - EXPECTED_BALANCE;
    
    console.log(`   Calculado vs Actual (BD):   ${diffCalculatedVsActual.toLocaleString('es-CL')} CLP ${diffCalculatedVsActual === 0 ? '✅' : '❌'}`);
    console.log(`   Calculado vs Esperado:      ${diffCalculatedVsExpected.toLocaleString('es-CL')} CLP ${diffCalculatedVsExpected === 0 ? '✅' : '❌'}`);
    console.log(`   Actual vs Esperado:         ${diffActualVsExpected.toLocaleString('es-CL')} CLP ${diffActualVsExpected === 0 ? '✅' : '❌'}\n`);
    
    console.log('═'.repeat(100) + '\n');
    
    // Step 5: Analysis
    console.log('🔍 Paso 5: ANÁLISIS\n');
    
    if (diffCalculatedVsActual === 0) {
      console.log('   ✅ El balance en la BD coincide con el cálculo basado en transacciones');
      console.log('   → Las transacciones están actualizando correctamente el balance\n');
    } else {
      console.log('   ❌ El balance en la BD NO coincide con el cálculo');
      console.log(`   → Hay una diferencia de ${Math.abs(diffCalculatedVsActual).toLocaleString('es-CL')} CLP`);
      console.log('   → Posible problema en la lógica de actualización de balance\n');
    }
    
    if (diffCalculatedVsExpected === 0) {
      console.log('   ✅ El cálculo coincide con tus expectativas\n');
    } else {
      console.log('   ❌ El cálculo NO coincide con tus expectativas');
      console.log(`   → Diferencia de ${Math.abs(diffCalculatedVsExpected).toLocaleString('es-CL')} CLP`);
      console.log('   → Posibles causas:');
      console.log('     • Transacciones faltantes en la BD');
      console.log('     • Transacciones duplicadas');
      console.log('     • Diferente saldo inicial');
      console.log('     • Transacciones no asociadas a esta tarjeta\n');
    }
    
    console.log('═'.repeat(100) + '\n');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Run the verification
verifyCreditCardBalance()
  .then(() => {
    console.log('✅ Verificación completada. Presiona Ctrl+C para salir.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
