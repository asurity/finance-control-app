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
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';
import { CategoryBudgetMapper } from '@/infrastructure/mappers/CategoryBudgetMapper';

/**
 * Firestore implementation of Category Budget Repository
 *
 * Handles all category budget persistence operations using Firestore.
 */
export class FirestoreCategoryBudgetRepository implements ICategoryBudgetRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'categoryBudgets';
  }

  async create(data: CategoryBudget): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...CategoryBudgetMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<CategoryBudget | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return CategoryBudgetMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<CategoryBudget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('percentage', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => CategoryBudgetMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, data: CategoryBudget): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = CategoryBudgetMapper.toFirestoreUpdate(data);
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

  async getByBudgetPeriodId(budgetPeriodId: string): Promise<CategoryBudget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('budgetPeriodId', '==', budgetPeriodId),
      orderBy('percentage', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => CategoryBudgetMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByBudgetPeriodAndCategory(
    budgetPeriodId: string,
    categoryId: string
  ): Promise<CategoryBudget | null> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('budgetPeriodId', '==', budgetPeriodId),
      where('categoryId', '==', categoryId)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return CategoryBudgetMapper.toDomain({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allCategoryBudgets = await this.getByBudgetPeriodId(budgetPeriodId);
        return allCategoryBudgets.find((cb) => cb.categoryId === categoryId) || null;
      }
      throw error;
    }
  }

  async getByCategoryId(categoryId: string): Promise<CategoryBudget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('categoryId', '==', categoryId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => CategoryBudgetMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByUserId(userId: string): Promise<CategoryBudget[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      orderBy('percentage', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => CategoryBudgetMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async updateSpentAmount(id: string, spentAmount: number): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    await updateDoc(docRef, {
      spentAmount,
      updatedAt: new Date(),
    });
  }

  async incrementSpentAmount(id: string, amount: number): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    await updateDoc(docRef, {
      spentAmount: increment(amount),
      updatedAt: new Date(),
    });
  }

  async decrementSpentAmount(id: string, amount: number): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    await updateDoc(docRef, {
      spentAmount: increment(-amount),
      updatedAt: new Date(),
    });
  }

  async getTotalPercentage(budgetPeriodId: string, excludeId?: string): Promise<number> {
    const categoryBudgets = await this.getByBudgetPeriodId(budgetPeriodId);

    return categoryBudgets
      .filter((cb) => !excludeId || cb.id !== excludeId)
      .reduce((sum, cb) => sum + cb.percentage, 0);
  }

  async deleteByBudgetPeriodId(budgetPeriodId: string): Promise<void> {
    const categoryBudgets = await this.getByBudgetPeriodId(budgetPeriodId);

    if (categoryBudgets.length === 0) return;

    // Use batch delete for efficiency
    const batch = writeBatch(db);

    categoryBudgets.forEach((cb) => {
      const docRef = doc(db, this.collectionPath, cb.id);
      batch.delete(docRef);
    });

    await batch.commit();
  }

  async recalculateAllocatedAmounts(budgetPeriodId: string, newTotalAmount: number): Promise<void> {
    const categoryBudgets = await this.getByBudgetPeriodId(budgetPeriodId);

    if (categoryBudgets.length === 0) return;

    // Use batch update for efficiency
    const batch = writeBatch(db);

    categoryBudgets.forEach((cb) => {
      const newAllocatedAmount = CategoryBudget.calculateAllocatedAmount(
        newTotalAmount,
        cb.percentage
      );

      const docRef = doc(db, this.collectionPath, cb.id);
      batch.update(docRef, {
        allocatedAmount: newAllocatedAmount,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  }
}
