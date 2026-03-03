import { DocumentData, Timestamp } from 'firebase/firestore';
import { Account } from '@/types/firestore';

/**
 * Account mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 */
export class AccountMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns Account domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): Account {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      balance: doc.balance,
      currency: doc.currency,
      isActive: doc.isActive !== undefined ? doc.isActive : true,
      // Credit card specific fields
      creditCardId: doc.creditCardId,
      creditLimit: doc.creditLimit,
      availableCredit: doc.availableCredit,
      cutoffDay: doc.cutoffDay,
      paymentDueDay: doc.paymentDueDay,
    };
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param account - Account domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(account: Omit<Account, 'id'>): DocumentData {
    return {
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency || 'CLP',
      isActive: account.isActive !== undefined ? account.isActive : true,
      // Credit card specific fields
      creditCardId: account.creditCardId || null,
      creditLimit: account.creditLimit || null,
      availableCredit: account.availableCredit || null,
      cutoffDay: account.cutoffDay || null,
      paymentDueDay: account.paymentDueDay || null,
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param account - Partial account data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(account: Partial<Account>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (account.name !== undefined) data.name = account.name;
    if (account.type !== undefined) data.type = account.type;
    if (account.balance !== undefined) data.balance = account.balance;
    if (account.currency !== undefined) data.currency = account.currency;
    if (account.isActive !== undefined) data.isActive = account.isActive;
    if (account.creditCardId !== undefined) data.creditCardId = account.creditCardId;
    if (account.creditLimit !== undefined) data.creditLimit = account.creditLimit;
    if (account.availableCredit !== undefined) data.availableCredit = account.availableCredit;
    if (account.cutoffDay !== undefined) data.cutoffDay = account.cutoffDay;
    if (account.paymentDueDay !== undefined) data.paymentDueDay = account.paymentDueDay;

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of Account domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): Account[] {
    return docs.map(doc => AccountMapper.toDomain(doc));
  }
}
