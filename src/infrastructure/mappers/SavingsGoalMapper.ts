import { DocumentData, Timestamp } from 'firebase/firestore';
import { SavingsGoal } from '@/types/firestore';

/**
 * Savings goal mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class SavingsGoalMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns SavingsGoal domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): SavingsGoal {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      targetAmount: doc.targetAmount,
      currentAmount: doc.currentAmount,
      currency: doc.currency || 'CLP',
      targetDate: doc.targetDate instanceof Timestamp ? doc.targetDate.toDate() : doc.targetDate ? new Date(doc.targetDate) : undefined,
      status: doc.status,
      icon: doc.icon,
      color: doc.color,
      linkedAccountId: doc.linkedAccountId,
      userId: doc.userId,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(doc.createdAt),
      updatedAt: doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : new Date(doc.updatedAt),
      completedAt: doc.completedAt instanceof Timestamp ? doc.completedAt.toDate() : doc.completedAt ? new Date(doc.completedAt) : undefined,
    };
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param savingsGoal - SavingsGoal domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(savingsGoal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): DocumentData {
    return {
      name: savingsGoal.name,
      description: savingsGoal.description || null,
      targetAmount: savingsGoal.targetAmount,
      currentAmount: savingsGoal.currentAmount || 0,
      currency: savingsGoal.currency || 'CLP',
      targetDate: savingsGoal.targetDate
        ? (savingsGoal.targetDate instanceof Date
          ? Timestamp.fromDate(savingsGoal.targetDate)
          : Timestamp.fromDate(new Date(savingsGoal.targetDate)))
        : null,
      status: savingsGoal.status || 'ACTIVE',
      icon: savingsGoal.icon || '🎯',
      color: savingsGoal.color || '#4CAF50',
      linkedAccountId: savingsGoal.linkedAccountId || null,
      userId: savingsGoal.userId,
      completedAt: savingsGoal.completedAt
        ? (savingsGoal.completedAt instanceof Date
          ? Timestamp.fromDate(savingsGoal.completedAt)
          : Timestamp.fromDate(new Date(savingsGoal.completedAt)))
        : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param savingsGoal - Partial savings goal data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(savingsGoal: Partial<SavingsGoal>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (savingsGoal.name !== undefined) data.name = savingsGoal.name;
    if (savingsGoal.description !== undefined) data.description = savingsGoal.description;
    if (savingsGoal.targetAmount !== undefined) data.targetAmount = savingsGoal.targetAmount;
    if (savingsGoal.currentAmount !== undefined) data.currentAmount = savingsGoal.currentAmount;
    if (savingsGoal.currency !== undefined) data.currency = savingsGoal.currency;
    if (savingsGoal.status !== undefined) data.status = savingsGoal.status;
    if (savingsGoal.icon !== undefined) data.icon = savingsGoal.icon;
    if (savingsGoal.color !== undefined) data.color = savingsGoal.color;
    if (savingsGoal.linkedAccountId !== undefined) data.linkedAccountId = savingsGoal.linkedAccountId;

    if (savingsGoal.targetDate !== undefined) {
      data.targetDate = savingsGoal.targetDate
        ? (savingsGoal.targetDate instanceof Date
          ? Timestamp.fromDate(savingsGoal.targetDate)
          : Timestamp.fromDate(new Date(savingsGoal.targetDate)))
        : null;
    }

    if (savingsGoal.completedAt !== undefined) {
      data.completedAt = savingsGoal.completedAt
        ? (savingsGoal.completedAt instanceof Date
          ? Timestamp.fromDate(savingsGoal.completedAt)
          : Timestamp.fromDate(new Date(savingsGoal.completedAt)))
        : null;
    }

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of SavingsGoal domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): SavingsGoal[] {
    return docs.map(doc => SavingsGoalMapper.toDomain(doc));
  }
}
