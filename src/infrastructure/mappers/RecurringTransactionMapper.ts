import { DocumentData, Timestamp } from 'firebase/firestore';
import { RecurringTransaction } from '@/types/firestore';
import { RecurringTransaction as RecurringTransactionEntity } from '@/domain/entities/RecurringTransaction';

/**
 * Recurring transaction mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class RecurringTransactionMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns RecurringTransaction domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): RecurringTransactionEntity {
    return new RecurringTransactionEntity(
      doc.id,
      doc.description,
      doc.amount,
      doc.type,
      doc.frequency,
      doc.accountId,
      doc.categoryId,
      doc.userId,
      doc.startDate instanceof Timestamp ? doc.startDate.toDate() : new Date(doc.startDate),
      doc.nextOccurrence instanceof Timestamp ? doc.nextOccurrence.toDate() : new Date(doc.nextOccurrence),
      doc.endDate instanceof Timestamp ? doc.endDate.toDate() : doc.endDate ? new Date(doc.endDate) : undefined,
      doc.lastProcessedDate instanceof Timestamp ? doc.lastProcessedDate.toDate() : doc.lastProcessedDate ? new Date(doc.lastProcessedDate) : undefined,
      doc.isActive !== undefined ? doc.isActive : true,
      doc.tags || [],
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : undefined,
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : undefined
    );
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param recurringTransaction - RecurringTransaction domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(recurringTransaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>): DocumentData {
    return {
      description: recurringTransaction.description,
      amount: recurringTransaction.amount,
      type: recurringTransaction.type,
      frequency: recurringTransaction.frequency,
      accountId: recurringTransaction.accountId,
      categoryId: recurringTransaction.categoryId,
      userId: recurringTransaction.userId,
      startDate: recurringTransaction.startDate instanceof Date
        ? Timestamp.fromDate(recurringTransaction.startDate)
        : Timestamp.fromDate(new Date(recurringTransaction.startDate)),
      endDate: recurringTransaction.endDate
        ? (recurringTransaction.endDate instanceof Date
          ? Timestamp.fromDate(recurringTransaction.endDate)
          : Timestamp.fromDate(new Date(recurringTransaction.endDate)))
        : null,
      nextOccurrence: recurringTransaction.nextOccurrence instanceof Date
        ? Timestamp.fromDate(recurringTransaction.nextOccurrence)
        : Timestamp.fromDate(new Date(recurringTransaction.nextOccurrence)),
      lastProcessedDate: recurringTransaction.lastProcessedDate
        ? (recurringTransaction.lastProcessedDate instanceof Date
          ? Timestamp.fromDate(recurringTransaction.lastProcessedDate)
          : Timestamp.fromDate(new Date(recurringTransaction.lastProcessedDate)))
        : null,
      isActive: recurringTransaction.isActive !== undefined ? recurringTransaction.isActive : true,
      tags: recurringTransaction.tags || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param recurringTransaction - Partial recurring transaction data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(recurringTransaction: Partial<RecurringTransaction>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (recurringTransaction.description !== undefined) data.description = recurringTransaction.description;
    if (recurringTransaction.amount !== undefined) data.amount = recurringTransaction.amount;
    if (recurringTransaction.type !== undefined) data.type = recurringTransaction.type;
    if (recurringTransaction.frequency !== undefined) data.frequency = recurringTransaction.frequency;
    if (recurringTransaction.accountId !== undefined) data.accountId = recurringTransaction.accountId;
    if (recurringTransaction.categoryId !== undefined) data.categoryId = recurringTransaction.categoryId;
    if (recurringTransaction.isActive !== undefined) data.isActive = recurringTransaction.isActive;
    if (recurringTransaction.tags !== undefined) data.tags = recurringTransaction.tags;

    if (recurringTransaction.startDate !== undefined) {
      data.startDate = recurringTransaction.startDate instanceof Date
        ? Timestamp.fromDate(recurringTransaction.startDate)
        : Timestamp.fromDate(new Date(recurringTransaction.startDate));
    }

    if (recurringTransaction.endDate !== undefined) {
      data.endDate = recurringTransaction.endDate
        ? (recurringTransaction.endDate instanceof Date
          ? Timestamp.fromDate(recurringTransaction.endDate)
          : Timestamp.fromDate(new Date(recurringTransaction.endDate)))
        : null;
    }

    if (recurringTransaction.nextOccurrence !== undefined) {
      data.nextOccurrence = recurringTransaction.nextOccurrence instanceof Date
        ? Timestamp.fromDate(recurringTransaction.nextOccurrence)
        : Timestamp.fromDate(new Date(recurringTransaction.nextOccurrence));
    }

    if (recurringTransaction.lastProcessedDate !== undefined) {
      data.lastProcessedDate = recurringTransaction.lastProcessedDate
        ? (recurringTransaction.lastProcessedDate instanceof Date
          ? Timestamp.fromDate(recurringTransaction.lastProcessedDate)
          : Timestamp.fromDate(new Date(recurringTransaction.lastProcessedDate)))
        : null;
    }

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of RecurringTransaction domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): RecurringTransaction[] {
    return docs.map(doc => RecurringTransactionMapper.toDomain(doc));
  }
}
