import { DocumentData, Timestamp } from 'firebase/firestore';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

/**
 * Category Budget mapper
 *
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class CategoryBudgetMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns CategoryBudget domain entity (class instance)
   */
  static toDomain(doc: DocumentData & { id: string }): CategoryBudget {
    return new CategoryBudget(
      doc.id,
      doc.budgetPeriodId,
      doc.categoryId,
      doc.percentage,
      doc.allocatedAmount,
      doc.spentAmount || 0,
      doc.userId,
      doc.organizationId || null,
      doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(doc.createdAt),
      doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : new Date(doc.updatedAt)
    );
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param categoryBudget - CategoryBudget domain entity
   * @returns Firestore document data
   */
  static toFirestore(categoryBudget: CategoryBudget): DocumentData {
    return {
      budgetPeriodId: categoryBudget.budgetPeriodId,
      categoryId: categoryBudget.categoryId,
      percentage: categoryBudget.percentage,
      allocatedAmount: categoryBudget.allocatedAmount,
      spentAmount: categoryBudget.spentAmount,
      userId: categoryBudget.userId,
      organizationId: categoryBudget.organizationId || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param categoryBudget - Partial category budget data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(categoryBudget: Partial<CategoryBudget>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (categoryBudget.percentage !== undefined) {
      data.percentage = categoryBudget.percentage;
    }

    if (categoryBudget.allocatedAmount !== undefined) {
      data.allocatedAmount = categoryBudget.allocatedAmount;
    }

    if (categoryBudget.spentAmount !== undefined) {
      data.spentAmount = categoryBudget.spentAmount;
    }

    return data;
  }
}
