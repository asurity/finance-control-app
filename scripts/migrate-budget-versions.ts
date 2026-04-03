/**
 * Migration Script: Add version field to existing budget documents
 * 
 * This script adds the `version` field to existing budgetPeriods and categoryBudgets
 * documents in Firestore. This is necessary for optimistic locking to work on legacy data.
 * 
 * Usage:
 *   ts-node scripts/migrate-budget-versions.ts
 * 
 * Or via npm script:
 *   npm run migrate:budget-versions
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';


// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Adds version field to documents in a collection
 */
async function addVersionToCollection(collectionName: string): Promise<number> {
  console.log(`\n📊 Processing collection: ${collectionName}`);
  
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  console.log(`   Found ${snapshot.size} documents`);
  
  if (snapshot.empty) {
    console.log(`   ✅ No documents to migrate`);
    return 0;
  }

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500;
  let updatedCount = 0;
  let batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    
    // Skip if version already exists
    if (data.version !== undefined) {
      continue;
    }

    // Add version field
    const docRef = doc(db, collectionName, docSnapshot.id);
    batch.update(docRef, { version: 1 });
    operationsInBatch++;
    updatedCount++;

    // Commit batch when reaching limit
    if (operationsInBatch >= batchSize) {
      await batch.commit();
      console.log(`   ⏳ Committed batch of ${operationsInBatch} updates`);
      batch = writeBatch(db);
      operationsInBatch = 0;
    }
  }

  // Commit remaining operations
  if (operationsInBatch > 0) {
    await batch.commit();
    console.log(`   ⏳ Committed final batch of ${operationsInBatch} updates`);
  }

  return updatedCount;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🔄 Starting migration: Add version field to budget documents');
  console.log('=' .repeat(70));

  try {
    // Migrate Budget Periods
    const budgetPeriodsUpdated = await addVersionToCollection('budgetPeriods');
    
    // Migrate Category Budgets
    const categoryBudgetsUpdated = await addVersionToCollection('categoryBudgets');

    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('✅ Migration completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Budget Periods updated: ${budgetPeriodsUpdated}`);
    console.log(`   Category Budgets updated: ${categoryBudgetsUpdated}`);
    console.log(`   Total documents updated: ${budgetPeriodsUpdated + categoryBudgetsUpdated}`);
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
