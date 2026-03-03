import { DocumentData, Timestamp } from 'firebase/firestore';
import { CreditCard } from '@/types/firestore';

/**
 * Credit card mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class CreditCardMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns CreditCard domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): CreditCard {
    return {
      id: doc.id,
      name: doc.name,
      accountId: doc.accountId,
      bank: doc.bank,
      lastFourDigits: doc.lastFourDigits,
      creditLimit: doc.creditLimit,
      availableCredit: doc.availableCredit,
      currentBalance: doc.currentBalance,
      cutoffDay: doc.cutoffDay,
      paymentDueDay: doc.paymentDueDay,
      interestRate: doc.interestRate,
      minimumPaymentPercent: doc.minimumPaymentPercent,
      currency: doc.currency || 'CLP',
      isActive: doc.isActive !== undefined ? doc.isActive : true,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(doc.createdAt),
      updatedAt: doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : new Date(doc.updatedAt),
    };
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param creditCard - CreditCard domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(creditCard: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): DocumentData {
    return {
      name: creditCard.name,
      accountId: creditCard.accountId,
      bank: creditCard.bank,
      lastFourDigits: creditCard.lastFourDigits,
      creditLimit: creditCard.creditLimit,
      availableCredit: creditCard.availableCredit,
      currentBalance: creditCard.currentBalance,
      cutoffDay: creditCard.cutoffDay,
      paymentDueDay: creditCard.paymentDueDay,
      interestRate: creditCard.interestRate,
      minimumPaymentPercent: creditCard.minimumPaymentPercent,
      currency: creditCard.currency || 'CLP',
      isActive: creditCard.isActive !== undefined ? creditCard.isActive : true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param creditCard - Partial credit card data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(creditCard: Partial<CreditCard>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (creditCard.name !== undefined) data.name = creditCard.name;
    if (creditCard.accountId !== undefined) data.accountId = creditCard.accountId;
    if (creditCard.bank !== undefined) data.bank = creditCard.bank;
    if (creditCard.lastFourDigits !== undefined) data.lastFourDigits = creditCard.lastFourDigits;
    if (creditCard.creditLimit !== undefined) data.creditLimit = creditCard.creditLimit;
    if (creditCard.availableCredit !== undefined) data.availableCredit = creditCard.availableCredit;
    if (creditCard.currentBalance !== undefined) data.currentBalance = creditCard.currentBalance;
    if (creditCard.cutoffDay !== undefined) data.cutoffDay = creditCard.cutoffDay;
    if (creditCard.paymentDueDay !== undefined) data.paymentDueDay = creditCard.paymentDueDay;
    if (creditCard.interestRate !== undefined) data.interestRate = creditCard.interestRate;
    if (creditCard.minimumPaymentPercent !== undefined) data.minimumPaymentPercent = creditCard.minimumPaymentPercent;
    if (creditCard.currency !== undefined) data.currency = creditCard.currency;
    if (creditCard.isActive !== undefined) data.isActive = creditCard.isActive;

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of CreditCard domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): CreditCard[] {
    return docs.map(doc => CreditCardMapper.toDomain(doc));
  }
}
