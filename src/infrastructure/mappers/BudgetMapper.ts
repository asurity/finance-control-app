import { DocumentData, Timestamp } from 'firebase/firestore';
import { Budget } from '@/types/firestore';

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
   * @returns Budget domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): Budget {
    return {
      id: doc.id,
      name: doc.name,
      amount: doc.amount,
      period: doc.period,
      categoryId: doc.categoryId,
      startDate: doc.startDate instanceof Timestamp ? doc.startDate.toDate() : new Date(doc.startDate),
      endDate: doc.endDate instanceof Timestamp ? doc.endDate.toDate() : new Date(doc.endDate),
    };
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
      period: budget.period,
      categoryId: budget.categoryId,
      startDate: budget.startDate instanceof Date
        ? Timestamp.fromDate(budget.startDate)
        : Timestamp.fromDate(new Date(budget.startDate)),
      endDate: budget.endDate instanceof Date
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
    if (budget.period !== undefined) data.period = budget.period;
    if (budget.categoryId !== undefined) data.categoryId = budget.categoryId;
    
    if (budget.startDate !== undefined) {
      data.startDate = budget.startDate instanceof Date
        ? Timestamp.fromDate(budget.startDate)
        : Timestamp.fromDate(new Date(budget.startDate));
    }
    
    if (budget.endDate !== undefined) {
      data.endDate = budget.endDate instanceof Date
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
  static toDomainArray(docs: Array<DocumentData & { id: string }>): Budget[] {
    return docs.map(doc => BudgetMapper.toDomain(doc));
  }
}
