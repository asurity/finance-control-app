import { DocumentData, Timestamp } from 'firebase/firestore';
import { SavingsGoal } from '@/types/firestore';
import { SavingsGoal as SavingsGoalEntity } from '@/domain/entities/SavingsGoal';

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
   * @returns SavingsGoal domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): SavingsGoalEntity {
    return new SavingsGoalEntity(
      doc.id,
      doc.name,
      doc.targetAmount,
      doc.currentAmount,
      doc.currency || 'CLP',
      doc.status,
      doc.userId,
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : doc.createdAt ? new Date(doc.createdAt) : new Date(),
      doc.description,
      doc.targetDate instanceof Timestamp ? doc.targetDate.toDate() : doc.targetDate ? new Date(doc.targetDate) : undefined,
      doc.icon,
      doc.color,
      doc.linkedAccountId,
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : undefined,
      doc.completedAt instanceof Timestamp ? doc.completedAt.toDate() : doc.completedAt ? new Date(doc.completedAt) : undefined
    );
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
  static toDomainArray(docs: Array<DocumentData & { id: string }>): SavingsGoalEntity[] {
    return docs.map(doc => SavingsGoalMapper.toDomain(doc));
  }
}
