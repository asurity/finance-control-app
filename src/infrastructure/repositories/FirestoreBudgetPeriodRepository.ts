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
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';
import { BudgetPeriodMapper } from '@/infrastructure/mappers/BudgetPeriodMapper';
import { OptimisticLockError } from '@/domain/errors/OptimisticLockError';

/**
 * Firestore implementation of Budget Period Repository
 *
 * Handles all budget period persistence operations using Firestore.
 */
export class FirestoreBudgetPeriodRepository implements IBudgetPeriodRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'budgetPeriods';
  }

  async create(data: BudgetPeriod): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...BudgetPeriodMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<BudgetPeriod | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return BudgetPeriodMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<BudgetPeriod[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, data: BudgetPeriod): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = BudgetPeriodMapper.toFirestoreUpdate(data);
    await updateDoc(docRef, firestoreData);
  }

  /**
   * Updates a budget period with optimistic locking to prevent concurrent modification conflicts
   * @param id - Document ID to update
   * @param data - Updated budget period data
   * @throws OptimisticLockError if the document has been modified by another user
   */
  async updateWithOptimisticLock(id: string, data: BudgetPeriod): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Budget period with ID ${id} not found`);
      }

      const currentData = docSnap.data();
      const currentVersion = currentData.version || 1;
      const attemptedVersion = data.version;

      // Check if version matches (optimistic lock)
      if (currentVersion !== attemptedVersion) {
        throw new OptimisticLockError(
          'BudgetPeriod',
          id,
          currentVersion,
          attemptedVersion
        );
      }

      // Update with incremented version
      const firestoreData = {
        ...BudgetPeriodMapper.toFirestoreUpdate(data),
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

  async getByUserId(userId: string): Promise<BudgetPeriod[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      orderBy('startDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByOrganizationId(organizationId: string): Promise<BudgetPeriod[]> {
    // organizationId param matches the orgId field in Firestore
    // All documents in the org share the same orgId
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', organizationId),
      orderBy('startDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getActiveByUserId(userId: string): Promise<BudgetPeriod[]> {
    const now = Timestamp.now();
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc')
    );

    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allPeriods = await this.getByUserId(userId);
        const nowDate = now.toDate();
        return allPeriods.filter(
          (period) => period.startDate <= nowDate && period.endDate >= nowDate
        );
      }
      throw error;
    }
  }

  async getByDate(userId: string, date: Date): Promise<BudgetPeriod | null> {
    const timestamp = Timestamp.fromDate(date);
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      where('startDate', '<=', timestamp),
      where('endDate', '>=', timestamp)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      // Return the first matching period
      const doc = snapshot.docs[0];
      return BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allPeriods = await this.getByUserId(userId);
        const matchingPeriod = allPeriods.find(
          (period) => period.startDate <= date && period.endDate >= date
        );
        return matchingPeriod || null;
      }
      throw error;
    }
  }

  async getByDateRange(userId: string, startDate: Date, endDate: Date): Promise<BudgetPeriod[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      where('startDate', '>=', Timestamp.fromDate(startDate)),
      where('startDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('startDate', 'desc')
    );

    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allPeriods = await this.getByUserId(userId);
        return allPeriods.filter(
          (period) => period.startDate >= startDate && period.startDate <= endDate
        );
      }
      throw error;
    }
  }

  async hasOverlap(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<boolean> {
    // Get all budget periods for the user
    const allPeriods = await this.getByUserId(userId);

    // Check for overlaps
    return allPeriods.some((period) => {
      // Skip the excluded period (for updates)
      if (excludeId && period.id === excludeId) return false;

      // Check if periods overlap
      // Periods overlap if one starts before the other ends
      return period.startDate < endDate && period.endDate > startDate;
    });
  }

  // ========================================
  // Organization-based methods (shared budgets)
  // ========================================

  async getActiveByOrganizationId(organizationId: string): Promise<BudgetPeriod[]> {
    const now = Timestamp.now();
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', organizationId),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc')
    );

    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allPeriods = await this.getByOrganizationId(organizationId);
        const nowDate = now.toDate();
        return allPeriods.filter(
          (period) => period.startDate <= nowDate && period.endDate >= nowDate
        );
      }
      throw error;
    }
  }

  async getByDateAndOrganization(organizationId: string, date: Date): Promise<BudgetPeriod | null> {
    const timestamp = Timestamp.fromDate(date);
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', organizationId),
      where('startDate', '<=', timestamp),
      where('endDate', '>=', timestamp)
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      // Return the first matching period
      const doc = snapshot.docs[0];
      return BudgetPeriodMapper.toDomain({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      // If composite index not available, fallback to client-side filtering
      if (error.code === 'failed-precondition') {
        const allPeriods = await this.getByOrganizationId(organizationId);
        const matchingPeriod = allPeriods.find(
          (period) => period.startDate <= date && period.endDate >= date
        );
        return matchingPeriod || null;
      }
      throw error;
    }
  }

  async hasOverlapInOrganization(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<boolean> {
    // Get all budget periods for the organization
    const allPeriods = await this.getByOrganizationId(organizationId);

    // Check for overlaps
    return allPeriods.some((period) => {
      // Skip the excluded period (for updates)
      if (excludeId && period.id === excludeId) return false;

      // Check if periods overlap
      // Periods overlap if one starts before the other ends
      return period.startDate < endDate && period.endDate > startDate;
    });
  }
}
