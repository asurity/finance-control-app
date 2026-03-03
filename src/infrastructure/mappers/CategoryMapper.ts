import { DocumentData, Timestamp } from 'firebase/firestore';
import { Category } from '@/types/firestore';

/**
 * Category mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 */
export class CategoryMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns Category domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): Category {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      icon: doc.icon,
      color: doc.color,
    };
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param category - Category domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(category: Omit<Category, 'id'>): DocumentData {
    return {
      name: category.name,
      type: category.type,
      icon: category.icon || '📁',
      color: category.color || '#666666',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param category - Partial category data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(category: Partial<Category>): DocumentData {
    const data: DocumentData = {
      updatedAt: Timestamp.now(),
    };

    if (category.name !== undefined) data.name = category.name;
    if (category.type !== undefined) data.type = category.type;
    if (category.icon !== undefined) data.icon = category.icon;
    if (category.color !== undefined) data.color = category.color;

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of Category domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): Category[] {
    return docs.map(doc => CategoryMapper.toDomain(doc));
  }
}
