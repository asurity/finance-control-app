import { DocumentData, Timestamp } from 'firebase/firestore';
import { Alert } from '@/types/firestore';

/**
 * Alert mapper
 * 
 * Transforms between Firestore document format and domain entity format.
 * Handles Timestamp ↔ Date conversions.
 */
export class AlertMapper {
  /**
   * Converts Firestore document to domain entity
   * @param doc - Firestore document data with ID
   * @returns Alert domain entity
   */
  static toDomain(doc: DocumentData & { id: string }): Alert {
    return {
      id: doc.id,
      type: doc.type,
      priority: doc.priority,
      title: doc.title,
      message: doc.message,
      isRead: doc.isRead || false,
      isArchived: doc.isArchived || false,
      userId: doc.userId,
      relatedEntityType: doc.relatedEntityType,
      relatedEntityId: doc.relatedEntityId,
      thresholdPercent: doc.thresholdPercent,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(doc.createdAt),
      readAt: doc.readAt instanceof Timestamp ? doc.readAt.toDate() : doc.readAt ? new Date(doc.readAt) : undefined,
      archivedAt: doc.archivedAt instanceof Timestamp ? doc.archivedAt.toDate() : doc.archivedAt ? new Date(doc.archivedAt) : undefined,
    };
  }

  /**
   * Converts domain entity to Firestore document format (for creation)
   * @param alert - Alert domain entity without ID
   * @returns Firestore document data
   */
  static toFirestore(alert: Omit<Alert, 'id' | 'createdAt'>): DocumentData {
    return {
      type: alert.type,
      priority: alert.priority,
      title: alert.title,
      message: alert.message,
      isRead: alert.isRead || false,
      isArchived: alert.isArchived || false,
      userId: alert.userId,
      relatedEntityType: alert.relatedEntityType || null,
      relatedEntityId: alert.relatedEntityId || null,
      thresholdPercent: alert.thresholdPercent || null,
      readAt: alert.readAt
        ? (alert.readAt instanceof Date ? Timestamp.fromDate(alert.readAt) : Timestamp.fromDate(new Date(alert.readAt)))
        : null,
      archivedAt: alert.archivedAt
        ? (alert.archivedAt instanceof Date ? Timestamp.fromDate(alert.archivedAt) : Timestamp.fromDate(new Date(alert.archivedAt)))
        : null,
      createdAt: Timestamp.now(),
    };
  }

  /**
   * Converts partial domain entity to Firestore document format (for updates)
   * @param alert - Partial alert data
   * @returns Firestore document data
   */
  static toFirestoreUpdate(alert: Partial<Alert>): DocumentData {
    const data: DocumentData = {};

    if (alert.type !== undefined) data.type = alert.type;
    if (alert.priority !== undefined) data.priority = alert.priority;
    if (alert.title !== undefined) data.title = alert.title;
    if (alert.message !== undefined) data.message = alert.message;
    if (alert.isRead !== undefined) data.isRead = alert.isRead;
    if (alert.isArchived !== undefined) data.isArchived = alert.isArchived;
    if (alert.relatedEntityType !== undefined) data.relatedEntityType = alert.relatedEntityType;
    if (alert.relatedEntityId !== undefined) data.relatedEntityId = alert.relatedEntityId;
    if (alert.thresholdPercent !== undefined) data.thresholdPercent = alert.thresholdPercent;

    if (alert.readAt !== undefined) {
      data.readAt = alert.readAt
        ? (alert.readAt instanceof Date ? Timestamp.fromDate(alert.readAt) : Timestamp.fromDate(new Date(alert.readAt)))
        : null;
    }

    if (alert.archivedAt !== undefined) {
      data.archivedAt = alert.archivedAt
        ? (alert.archivedAt instanceof Date ? Timestamp.fromDate(alert.archivedAt) : Timestamp.fromDate(new Date(alert.archivedAt)))
        : null;
    }

    return data;
  }

  /**
   * Converts array of Firestore documents to domain entities
   * @param docs - Array of Firestore documents
   * @returns Array of Alert domain entities
   */
  static toDomainArray(docs: Array<DocumentData & { id: string }>): Alert[] {
    return docs.map(doc => AlertMapper.toDomain(doc));
  }
}
