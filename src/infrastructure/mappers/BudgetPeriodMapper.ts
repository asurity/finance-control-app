import { DocumentData, Timestamp } from 'firebase/firestore';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Budget Period mapper
 *
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class BudgetPeriodMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns BudgetPeriod domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): BudgetPeriod {
    return new BudgetPeriod(
      doc.id,
      doc.totalAmount,
      doc.startDate instanceof Timestamp ? doc.startDate.toDate() : new Date(doc.startDate),
      doc.endDate instanceof Timestamp ? doc.endDate.toDate() : new Date(doc.endDate),
      doc.userId,
      doc.organizationId || null,
      doc.name,
      doc.description,
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(doc.createdAt),
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : new Date(doc.updatedAt)
    );
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param budgetPeriod - BudgetPeriod domain entity
   * @returns Firestore document data
   */
  static toFirestore(budgetPeriod: BudgetPeriod): DocumentData {
    return {
      totalAmount: budgetPeriod.totalAmount,
      startDate:
        budgetPeriod.startDate instanceof Date
          ? Timestamp.fromDate(budgetPeriod.startDate)
          : Timestamp.fromDate(new Date(budgetPeriod.startDate)),
      endDate:
        budgetPeriod.endDate instanceof Date
          ? Timestamp.fromDate(budgetPeriod.endDate)
          : Timestamp.fromDate(new Date(budgetPeriod.endDate)),
      userId: budgetPeriod.userId,
      organizationId: budgetPeriod.organizationId || null,
      name: budgetPeriod.name || null,
      description: budgetPeriod.description || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param budgetPeriod - Partial budget period data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(budgetPeriod: Partial<BudgetPeriod>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (budgetPeriod.totalAmount !== undefined) {
      data.totalAmount = budgetPeriod.totalAmount;
    }

    if (budgetPeriod.startDate) {
      data.startDate =
        budgetPeriod.startDate instanceof Date
          ? Timestamp.fromDate(budgetPeriod.startDate)
          : Timestamp.fromDate(new Date(budgetPeriod.startDate));
    }

    if (budgetPeriod.endDate) {
      data.endDate =
        budgetPeriod.endDate instanceof Date
          ? Timestamp.fromDate(budgetPeriod.endDate)
          : Timestamp.fromDate(new Date(budgetPeriod.endDate));
    }

    if (budgetPeriod.name !== undefined) {
      data.name = budgetPeriod.name || null;
    }

    if (budgetPeriod.description !== undefined) {
      data.description = budgetPeriod.description || null;
    }

    return data;
  }
}
