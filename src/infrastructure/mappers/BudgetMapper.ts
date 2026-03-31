import { DocumentData, Timestamp } from 'firebase/firestore';
import { Budget } from '@/types/firestore';
import { Budget as BudgetEntity } from '@/domain/entities/Budget';

/**
 * Budget mapper
 *
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class BudgetMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns Budget domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): BudgetEntity {
    return new BudgetEntity(
      doc.id,
      doc.name,
      doc.amount,
      doc.spent || 0,
      doc.period,
      doc.categoryId,
      doc.userId,
      doc.startDate instanceof Timestamp ? doc.startDate.toDate() : new Date(doc.startDate),
      doc.endDate instanceof Timestamp ? doc.endDate.toDate() : new Date(doc.endDate),
      doc.alertThreshold || 80,
      doc.isActive !== undefined ? doc.isActive : true,
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : undefined,
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : undefined
    );
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param budget - Budget domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(budget: Omit<Budget, 'id'>): DocumentData {
    return {
      name: budget.name,
      amount: budget.amount,
      spent: budget.spent || 0,
      period: budget.period,
      categoryId: budget.categoryId,
      userId: budget.userId,
      alertThreshold: budget.alertThreshold || 80,
      isActive: budget.isActive !== undefined ? budget.isActive : true,
      startDate:
        budget.startDate instanceof Date
          ? Timestamp.fromDate(budget.startDate)
          : Timestamp.fromDate(new Date(budget.startDate)),
      endDate:
        budget.endDate instanceof Date
          ? Timestamp.fromDate(budget.endDate)
          : Timestamp.fromDate(new Date(budget.endDate)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param budget - Partial budget data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(budget: Partial<Budget>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (budget.name !== undefined) data.name = budget.name;
    if (budget.amount !== undefined) data.amount = budget.amount;
    if (budget.spent !== undefined) data.spent = budget.spent;
    if (budget.period !== undefined) data.period = budget.period;
    if (budget.categoryId !== undefined) data.categoryId = budget.categoryId;
    if (budget.userId !== undefined) data.userId = budget.userId;
    if (budget.alertThreshold !== undefined) data.alertThreshold = budget.alertThreshold;
    if (budget.isActive !== undefined) data.isActive = budget.isActive;

    if (budget.startDate !== undefined) {
      data.startDate =
        budget.startDate instanceof Date
          ? Timestamp.fromDate(budget.startDate)
          : Timestamp.fromDate(new Date(budget.startDate));
    }

    if (budget.endDate !== undefined) {
      data.endDate =
        budget.endDate instanceof Date
          ? Timestamp.fromDate(budget.endDate)
          : Timestamp.fromDate(new Date(budget.endDate));
    }

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of Budget domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): BudgetEntity[] {
    return docs.map((doc) => BudgetMapper.toDomain(doc));
  }
}
