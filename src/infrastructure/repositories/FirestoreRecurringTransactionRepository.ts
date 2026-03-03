import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { IRecurringTransactionRepository } from '@/domain/repositories/IRecurringTransactionRepository';
import { RecurringTransaction, RecurrenceFrequency } from '@/types/firestore';
import { RecurringTransactionMapper } from '@/infrastructure/mappers/RecurringTransactionMapper';

/**
 * Firestore implementation of Recurring Transaction Repository
 */
export class FirestoreRecurringTransactionRepository implements IRecurringTransactionRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = `organizations/${orgId}/recurringTransactions`;
  }

  async create(data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = RecurringTransactionMapper.toFirestore(data);
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<RecurringTransaction | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return RecurringTransactionMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, orderBy('nextOccurrence', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async update(id: string, data: Partial<RecurringTransaction>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = RecurringTransactionMapper.toFirestoreUpdate(data);
    await updateDoc(docRef, firestoreData);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    await deleteDoc(docRef);
  }

  async exists(id: string): Promise<boolean> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  async getActive(): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('isActive', '==', true),
      orderBy('nextOccurrence', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByFrequency(frequency: RecurrenceFrequency): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('frequency', '==', frequency),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByAccount(accountId: string): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('accountId', '==', accountId),
      orderBy('nextOccurrence', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByCategory(categoryId: string): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('categoryId', '==', categoryId),
      orderBy('nextOccurrence', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getDueForProcessing(currentDate: Date): Promise<RecurringTransaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('isActive', '==', true),
      where('nextOccurrence', '<=', Timestamp.fromDate(currentDate))
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      RecurringTransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async process(recurringTransactionId: string): Promise<string> {
    // Note: This should create an actual transaction
    // For now, return placeholder - should be implemented by a use case
    return `transaction_from_recurring_${recurringTransactionId}_${Date.now()}`;
  }

  async updateNextOccurrence(recurringTransactionId: string, nextDate: Date): Promise<void> {
    await this.update(recurringTransactionId, {
      nextOccurrence: nextDate,
      lastProcessedDate: new Date(),
    });
  }

  async cancel(recurringTransactionId: string): Promise<void> {
    await this.update(recurringTransactionId, { isActive: false });
  }

  async getGeneratedTransactions(recurringTransactionId: string): Promise<string[]> {
    // Note: This would require querying transactions
    // For now, return empty array - should be implemented by querying transactions collection
    return [];
  }
}
