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
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Transaction, TransactionType } from '@/types/firestore';
import { TransactionMapper } from '@/infrastructure/mappers/TransactionMapper';

/**
 * Firestore implementation of Transaction Repository
 * 
 * Handles all transaction persistence operations using Firestore.
 */
export class FirestoreTransactionRepository implements ITransactionRepository {
  private collectionPath: string;

  constructor(orgId: string) {
    this.collectionPath = `organizations/${orgId}/transactions`;
  }

  async create(data: Omit<Transaction, 'id'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = TransactionMapper.toFirestore(data);
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<Transaction | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return TransactionMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async update(id: string, data: Partial<Transaction>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = TransactionMapper.toFirestoreUpdate(data);
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

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('categoryId', '==', categoryId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByAccount(accountId: string): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('accountId', '==', accountId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByType(type: TransactionType): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('type', '==', type),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async createInstallment(data: Omit<Transaction, 'id'>, installments: number): Promise<string[]> {
    const installmentGroupId = `installment_${Date.now()}`;
    const installmentAmount = data.amount / installments;
    const transactionIds: string[] = [];

    for (let i = 1; i <= installments; i++) {
      const installmentDate = new Date(data.date);
      installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

      const installmentTransaction: Omit<Transaction, 'id'> = {
        ...data,
        amount: installmentAmount,
        description: `${data.description} (Cuota ${i}/${installments})`,
        isInstallment: true,
        installmentNumber: i,
        totalInstallments: installments,
        installmentGroupId,
        date: installmentDate,
      };

      const id = await this.create(installmentTransaction);
      transactionIds.push(id);
    }

    return transactionIds;
  }

  async getByInstallmentGroup(installmentGroupId: string): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('installmentGroupId', '==', installmentGroupId),
      orderBy('installmentNumber', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    averageTransaction: number;
    topCategory: { categoryId: string; amount: number } | null;
  }> {
    const transactions = await this.getByDateRange(startDate, endDate);

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const transactionCount = transactions.length;
    const averageTransaction = transactionCount > 0 
      ? (totalIncome + totalExpenses) / transactionCount 
      : 0;

    // Calculate top category by expenses
    const categoryTotals = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    let topCategory: { categoryId: string; amount: number } | null = null;
    let maxAmount = 0;

    for (const [categoryId, amount] of Object.entries(categoryTotals)) {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCategory = { categoryId, amount };
      }
    }

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount,
      averageTransaction,
      topCategory,
    };
  }

  async getByUser(userId: string): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByCreditCard(creditCardId: string): Promise<Transaction[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('creditCardId', '==', creditCardId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      TransactionMapper.toDomain({ id: doc.id, ...doc.data() })
    );
  }

  async getByTags(tags: string[]): Promise<Transaction[]> {
    // Note: Firestore doesn't support array-contains-any with multiple values efficiently
    // We'll fetch all and filter in memory for now
    const allTransactions = await this.getAll();
    
    return allTransactions.filter(transaction =>
      transaction.tags && tags.some(tag => transaction.tags!.includes(tag))
    );
  }
}
