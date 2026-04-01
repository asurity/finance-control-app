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
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { Account, AccountType } from '@/types/firestore';
import { AccountMapper } from '@/infrastructure/mappers/AccountMapper';

/**
 * Firestore implementation of Account Repository
 *
 * Handles all account persistence operations using Firestore.
 */
export class FirestoreAccountRepository implements IAccountRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'accounts';
  }

  async create(data: Omit<Account, 'id'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...AccountMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<Account | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return AccountMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<Account[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId));
    const snapshot = await getDocs(q);

    const accounts = snapshot.docs.map((doc) =>
      AccountMapper.toDomain({ id: doc.id, ...doc.data() })
    );

    // Sort in memory to avoid composite index requirement
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  }

  async update(id: string, data: Partial<Account>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = AccountMapper.toFirestoreUpdate(data);
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

  async getActive(): Promise<Account[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(ref, where('orgId', '==', this.orgId), where('isActive', '==', true));

    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map((doc) =>
      AccountMapper.toDomain({ id: doc.id, ...doc.data() })
    );

    // Sort in memory to avoid composite index requirement
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getByType(type: AccountType): Promise<Account[]> {
    const ref = collection(db, this.collectionPath);
    const q = query(
      ref,
      where('orgId', '==', this.orgId),
      where('type', '==', type),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => AccountMapper.toDomain({ id: doc.id, ...doc.data() }));
  }

  async updateBalance(accountId: string, newBalance: number): Promise<void> {
    const account = await this.getById(accountId);
    if (!account) throw new Error('Account not found');

    const updates: Partial<Account> = {
      balance: newBalance,
    };

    // Update available credit for credit accounts
    if (account.creditLimit) {
      if (account.type === 'LINE_OF_CREDIT') {
        // LINE_OF_CREDIT: balance is available credit
        updates.availableCredit = newBalance;
      } else if (account.type === 'CREDIT_CARD') {
        // CREDIT_CARD: available = limit + balance (balance negative=debt, positive=saldo a favor)
        updates.availableCredit = account.creditLimit + newBalance;
      }
    }

    await this.update(accountId, updates);
  }

  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string
  ): Promise<[string, string]> {
    if (amount <= 0) throw new Error('Transfer amount must be positive');

    const fromAccount = await this.getById(fromAccountId);
    const toAccount = await this.getById(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('One or both accounts not found');
    }

    // Check sufficient balance (not applicable for credit cards)
    if (fromAccount.type !== 'CREDIT_CARD' && fromAccount.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Update both accounts
    await this.updateBalance(fromAccountId, fromAccount.balance - amount);
    await this.updateBalance(toAccountId, toAccount.balance + amount);

    // Return transaction IDs (placeholder - actual transactions should be created by a use case)
    return ['transfer_from_' + Date.now(), 'transfer_to_' + Date.now()];
  }

  async getNetWorth(): Promise<number> {
    const accounts = await this.getActive();

    let assets = 0;
    let liabilities = 0;

    accounts.forEach((account) => {
      if (account.type === 'CREDIT_CARD') {
        liabilities += account.balance;
      } else {
        assets += account.balance;
      }
    });

    return assets - liabilities;
  }

  async getAvailableToSpend(): Promise<number> {
    const accounts = await this.getActive();

    let cashAvailable = 0;
    let creditAvailable = 0;

    accounts.forEach((account) => {
      if (account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT') {
        // For credit accounts, add available credit
        const availableCredit = account.availableCredit ?? 
          (account.creditLimit ? account.creditLimit + account.balance : 0);
        creditAvailable += availableCredit;
      } else {
        // For regular accounts, add positive balance
        cashAvailable += Math.max(0, account.balance);
      }
    });

    return cashAvailable + creditAvailable;
  }

  async getBalanceHistory(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; balance: number }>> {
    // Note: This would require tracking balance changes over time
    // For now, return empty array - should be implemented with a separate balance_history collection
    // or by aggregating transaction history
    return [];
  }

  async deactivate(accountId: string): Promise<void> {
    await this.update(accountId, { isActive: false });
  }

  async reactivate(accountId: string): Promise<void> {
    await this.update(accountId, { isActive: true });
  }
}
