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
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { Budget, BudgetPeriod } from '@/types/firestore';
import { BudgetMapper } from '@/infrastructure/mappers/BudgetMapper';

/**
 * Firestore implementation of Budget Repository
 */
export class FirestoreBudgetRepository implements IBudgetRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'budgets';
  }

  async create(data: Omit<Budget, 'id'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...BudgetMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<Budget | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return BudgetMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<Budget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      BudgetMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async update(id: string, data: Partial<Budget>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = BudgetMapper.toFirestoreUpdate(data);
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

  async getByCategory(categoryId: string): Promise<Budget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('categoryId', '==', categoryId),
      orderBy('startDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      BudgetMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByPeriod(period: BudgetPeriod): Promise<Budget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), where('period', '==', period));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      BudgetMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getActive(currentDate: Date): Promise<Budget[]> {
    const allBudgets = await this.getAll();
    
    return allBudgets.filter(budget => {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);
      return currentDate >= start && currentDate <= end;
    });
  }

  async getUsage(budgetId: string): Promise<{
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    isExceeded: boolean;
  }> {
    // Note: This requires accessing transactions
    // Should be implemented by a use case
    const budget = await this.getById(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    return {
      budgetAmount: budget.amount,
      spentAmount: 0,
      remainingAmount: budget.amount,
      percentageUsed: 0,
      isExceeded: false,
    };
  }

  async isExceeded(budgetId: string): Promise<boolean> {
    const usage = await this.getUsage(budgetId);
    return usage.isExceeded;
  }

  async updateSpent(budgetId: string, amount: number): Promise<void> {
    const budget = await this.getById(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const newSpent = (budget.spent || 0) + amount;
    await this.update(budgetId, { spent: newSpent });
  }

  async getBudgetAlerts(thresholdPercent: number = 80): Promise<Budget[]> {
    // Note: This requires calculating usage for all budgets
    // Should be implemented by a use case
    return [];
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<Budget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('startDate', '<=', Timestamp.fromDate(endDate)),
      where('endDate', '>=', Timestamp.fromDate(startDate))
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      BudgetMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }
}
