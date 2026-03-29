import { DocumentData, Timestamp } from 'firebase/firestore';
import { Transaction } from '@/types/firestore';
import { Transaction as TransactionEntity } from '@/domain/entities/Transaction';

/**
 * Transaction mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class TransactionMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns Transaction domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): TransactionEntity {
    return new TransactionEntity(
      doc.id,
      doc.type,
      doc.amount,
      doc.description,
      doc.date instanceof Timestamp ? doc.date.toDate() : new Date(doc.date),
      doc.accountId,
      doc.categoryId,
      doc.userId,
      doc.tags || [],
      doc.receiptUrl,
      doc.isInstallment || false,
      doc.installmentNumber,
      doc.totalInstallments,
      doc.installmentGroupId,
      doc.isRecurring || false,
      doc.recurringTransactionId,
      doc.creditCardId,
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : undefined,
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : undefined
    );
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param transaction - Transaction domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(transaction: Omit<Transaction, 'id'>): DocumentData {
    return {
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date instanceof Date 
        ? Timestamp.fromDate(transaction.date) 
        : Timestamp.fromDate(new Date(transaction.date)),
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      userId: transaction.userId,
      tags: transaction.tags || [],
      receiptUrl: transaction.receiptUrl || null,
      // Installments
      isInstallment: transaction.isInstallment || false,
      installmentNumber: transaction.installmentNumber || null,
      totalInstallments: transaction.totalInstallments || null,
      installmentGroupId: transaction.installmentGroupId || null,
      // Recurring
      isRecurring: transaction.isRecurring || false,
      recurringTransactionId: transaction.recurringTransactionId || null,
      // Credit card
      creditCardId: transaction.creditCardId || null,
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param transaction - Partial transaction data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(transaction: Partial<Transaction>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (transaction.description !== undefined) {
      data.description = transaction.description;
    }
    if (transaction.amount !== undefined) {
      data.amount = transaction.amount;
    }
    if (transaction.type !== undefined) {
      data.type = transaction.type;
    }
    if (transaction.date !== undefined) {
      data.date = transaction.date instanceof Date
        ? Timestamp.fromDate(transaction.date)
        : Timestamp.fromDate(new Date(transaction.date));
    }
    if (transaction.accountId !== undefined) {
      data.accountId = transaction.accountId;
    }
    if (transaction.categoryId !== undefined) {
      data.categoryId = transaction.categoryId;
    }
    if (transaction.tags !== undefined) {
      data.tags = transaction.tags;
    }
    if (transaction.receiptUrl !== undefined) {
      data.receiptUrl = transaction.receiptUrl;
    }
    if (transaction.isInstallment !== undefined) {
      data.isInstallment = transaction.isInstallment;
    }
    if (transaction.installmentNumber !== undefined) {
      data.installmentNumber = transaction.installmentNumber;
    }
    if (transaction.totalInstallments !== undefined) {
      data.totalInstallments = transaction.totalInstallments;
    }
    if (transaction.installmentGroupId !== undefined) {
      data.installmentGroupId = transaction.installmentGroupId;
    }
    if (transaction.creditCardId !== undefined) {
      data.creditCardId = transaction.creditCardId;
    }

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of Transaction domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): Transaction[] {
    return docs.map(doc => TransactionMapper.toDomain(doc));
  }
}
