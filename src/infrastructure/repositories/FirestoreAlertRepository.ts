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
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { Alert, AlertType, AlertPriority } from '@/types/firestore';
import { AlertMapper } from '@/infrastructure/mappers/AlertMapper';

/**
 * Firestore implementation of Alert Repository
 */
export class FirestoreAlertRepository implements IAlertRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'alerts';
  }

  async create(data: Omit<Alert, 'id' | 'createdAt'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...AlertMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<Alert | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return AlertMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async update(id: string, data: Partial<Alert>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = AlertMapper.toFirestoreUpdate(data);
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

  async getUnread(): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('isRead', '==', false),
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByType(type: AlertType): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByPriority(priority: AlertPriority): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('priority', '==', priority),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async getByUser(userId: string): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async markAsRead(alertId: string): Promise<void> {
    await this.update(alertId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  async markMultipleAsRead(alertIds: string[]): Promise<void> {
    const batch = writeBatch(db);

    for (const alertId of alertIds) {
      const docRef = doc(db, this.collectionPath, alertId);
      batch.update(docRef, {
        isRead: true,
        readAt: Timestamp.now(),
      });
    }

    await batch.commit();
  }

  async archive(alertId: string): Promise<void> {
    await this.update(alertId, {
      isArchived: true,
      archivedAt: new Date(),
    });
  }

  async getArchived(): Promise<Alert[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('isArchived', '==', true),
      orderBy('archivedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AlertMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async createBudgetAlert(
    budgetId: string,
    userId: string,
    budgetName: string,
    percentUsed: number
  ): Promise<string> {
    const alert: Omit<Alert, 'id' | 'createdAt'> = {
      type: 'BUDGET_THRESHOLD',
      priority: percentUsed >= 100 ? 'URGENT' : percentUsed >= 90 ? 'HIGH' : 'MEDIUM',
      title: 'Límite de Presupuesto',
      message: `El presupuesto "${budgetName}" ha alcanzado el ${percentUsed.toFixed(1)}% de su límite`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'budget',
      relatedEntityId: budgetId,
      thresholdPercent: percentUsed,
    };

    return this.create(alert);
  }

  async createPaymentDueAlert(
    entityId: string,
    userId: string,
    dueDate: Date,
    amount: number
  ): Promise<string> {
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const alert: Omit<Alert, 'id' | 'createdAt'> = {
      type: 'PAYMENT_DUE',
      priority: daysUntilDue <= 1 ? 'URGENT' : daysUntilDue <= 3 ? 'HIGH' : 'MEDIUM',
      title: 'Pago Próximo a Vencer',
      message: `Tienes un pago de $${amount.toLocaleString('es-CL')} que vence en ${daysUntilDue} día(s)`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'transaction',
      relatedEntityId: entityId,
    };

    return this.create(alert);
  }

  async createLowBalanceAlert(
    accountId: string,
    userId: string,
    accountName: string,
    currentBalance: number
  ): Promise<string> {
    const alert: Omit<Alert, 'id' | 'createdAt'> = {
      type: 'LOW_BALANCE',
      priority: currentBalance <= 0 ? 'URGENT' : 'HIGH',
      title: 'Saldo Bajo',
      message: `La cuenta "${accountName}" tiene un saldo bajo: $${currentBalance.toLocaleString('es-CL')}`,
      isRead: false,
      isArchived: false,
      userId,
      relatedEntityType: 'account',
      relatedEntityId: accountId,
    };

    return this.create(alert);
  }

  async getCountByPriority(userId: string): Promise<{
    urgent: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }> {
    const alerts = await this.getUnread();
    const userAlerts = alerts.filter((alert) => alert.userId === userId);

    const counts = {
      urgent: userAlerts.filter((a) => a.priority === 'URGENT').length,
      high: userAlerts.filter((a) => a.priority === 'HIGH').length,
      medium: userAlerts.filter((a) => a.priority === 'MEDIUM').length,
      low: userAlerts.filter((a) => a.priority === 'LOW').length,
      total: userAlerts.length,
    };

    return counts;
  }
}
