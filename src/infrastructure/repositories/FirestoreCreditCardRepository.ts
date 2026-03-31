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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { CreditCard, CreditCardStatement } from '@/types/firestore';
import { CreditCardMapper } from '@/infrastructure/mappers/CreditCardMapper';

/**
 * Firestore implementation of Credit Card Repository
 */
export class FirestoreCreditCardRepository implements ICreditCardRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'creditCards';
  }

  async create(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...CreditCardMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<CreditCard | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return CreditCardMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<CreditCard[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      CreditCardMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async update(id: string, data: Partial<CreditCard>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = CreditCardMapper.toFirestoreUpdate(data);
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

  async getActive(): Promise<CreditCard[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      CreditCardMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByAccount(accountId: string): Promise<CreditCard[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), where('accountId', '==', accountId));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      CreditCardMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async updateBalance(creditCardId: string, newBalance: number): Promise<void> {
    const card = await this.getById(creditCardId);
    if (!card) throw new Error('Credit card not found');

    const availableCredit = card.creditLimit - newBalance;

    await this.update(creditCardId, {
      currentBalance: newBalance,
      availableCredit,
    });
  }

  async updateAvailableCredit(creditCardId: string, availableCredit: number): Promise<void> {
    await this.update(creditCardId, { availableCredit });
  }

  async calculateMinimumPayment(creditCardId: string): Promise<number> {
    const card = await this.getById(creditCardId);
    if (!card) throw new Error('Credit card not found');

    return card.currentBalance * (card.minimumPaymentPercent / 100);
  }

  async calculateInterest(creditCardId: string, days: number = 30): Promise<number> {
    const card = await this.getById(creditCardId);
    if (!card) throw new Error('Credit card not found');

    // Simple interest calculation: balance * (rate / 365) * days
    const dailyRate = card.interestRate / 365 / 100;
    return card.currentBalance * dailyRate * days;
  }

  async generateStatement(creditCardId: string, statementDate: Date): Promise<string> {
    // Note: This should create a statement in a separate collection
    // For now, return a placeholder ID
    return `statement_${creditCardId}_${statementDate.getTime()}`;
  }

  async getStatements(creditCardId: string): Promise<CreditCardStatement[]> {
    // Note: This should query a separate statements collection
    // For now, return empty array
    return [];
  }

  async processPayment(creditCardId: string, amount: number, accountId: string): Promise<string> {
    const card = await this.getById(creditCardId);
    if (!card) throw new Error('Credit card not found');

    // Update credit card balance
    const newBalance = Math.max(0, card.currentBalance - amount);
    await this.updateBalance(creditCardId, newBalance);

    // Return transaction ID (should be created by a use case)
    return `payment_${creditCardId}_${Date.now()}`;
  }

  async isApproachingLimit(creditCardId: string, thresholdPercent: number = 90): Promise<boolean> {
    const card = await this.getById(creditCardId);
    if (!card) return false;

    const usagePercent = (card.currentBalance / card.creditLimit) * 100;
    return usagePercent >= thresholdPercent;
  }
}
