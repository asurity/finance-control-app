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
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';
import { CategoryBudgetMapper } from '@/infrastructure/mappers/CategoryBudgetMapper';
import { OptimisticLockError } from '@/domain/errors/OptimisticLockError';

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

  /**
   * Updates a category budget with optimistic locking to prevent concurrent modification conflicts
   * @param id - Document ID to update
   * @param data - Updated category budget data
   * @throws OptimisticLockError if the document has been modified by another user
   */
  async updateWithOptimisticLock(id: string, data: CategoryBudget): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Category budget with ID ${id} not found`);
      }

      const currentData = docSnap.data();
      const currentVersion = currentData.version || 1;
      const attemptedVersion = data.version;

      // Check if version matches (optimistic lock)
      if (currentVersion !== attemptedVersion) {
        throw new OptimisticLockError(
          'CategoryBudget',
          id,
          currentVersion,
          attemptedVersion
        );
      }

      // Update with incremented version
      const firestoreData = {
        ...CategoryBudgetMapper.toFirestoreUpdate(data),
        version: currentVersion + 1,
      };

      transaction.update(docRef, firestoreData);
    });
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
