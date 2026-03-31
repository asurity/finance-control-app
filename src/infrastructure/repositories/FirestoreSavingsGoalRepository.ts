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
import { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import { SavingsGoal, SavingsGoalStatus, SavingsGoalContribution } from '@/types/firestore';
import { SavingsGoalMapper } from '@/infrastructure/mappers/SavingsGoalMapper';

/**
 * Firestore implementation of Savings Goal Repository
 */
export class FirestoreSavingsGoalRepository implements ISavingsGoalRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'savingsGoals';
  }

  async create(data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...SavingsGoalMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<SavingsGoal | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return SavingsGoalMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<SavingsGoal[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => SavingsGoalMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, data: Partial<SavingsGoal>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = SavingsGoalMapper.toFirestoreUpdate(data);
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

  async getActive(): Promise<SavingsGoal[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('status', '==', 'ACTIVE'),
      orderBy('targetDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => SavingsGoalMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByStatus(status: SavingsGoalStatus): Promise<SavingsGoal[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => SavingsGoalMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByUser(userId: string): Promise<SavingsGoal[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => SavingsGoalMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async addContribution(
    goalId: string,
    amount: number,
    transactionId?: string,
    note?: string
  ): Promise<string> {
    // Note: This should create a contribution in a separate collection
    // For now, just update the goal's current amount
    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Savings goal not found');

    const newAmount = goal.currentAmount + amount;
    await this.updateProgress(goalId, newAmount);

    // Check if goal is completed
    if (newAmount >= goal.targetAmount) {
      await this.complete(goalId);
    }

    return `contribution_${goalId}_${Date.now()}`;
  }

  async getContributions(goalId: string): Promise<SavingsGoalContribution[]> {
    // Note: This should query a separate contributions collection
    // For now, return empty array
    return [];
  }

  async updateProgress(goalId: string, newAmount: number): Promise<void> {
    await this.update(goalId, { currentAmount: newAmount });
  }

  async complete(goalId: string): Promise<void> {
    await this.update(goalId, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
  }

  async cancel(goalId: string): Promise<void> {
    await this.update(goalId, {
      status: 'CANCELLED',
    });
  }

  async getProgressPercent(goalId: string): Promise<number> {
    const goal = await this.getById(goalId);
    if (!goal) return 0;

    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  async getApproachingDeadline(daysThreshold: number = 30): Promise<SavingsGoal[]> {
    const goals = await this.getActive();
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return goals.filter((goal) => {
      if (!goal.targetDate) return false;
      const targetDate = new Date(goal.targetDate);
      return targetDate <= thresholdDate && targetDate >= now;
    });
  }

  async getTotalSavings(userId: string): Promise<number> {
    const goals = await this.getByUser(userId);
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

    return activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  }
}
