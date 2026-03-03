// Base Service - Repository Pattern for Firestore
// Provides generic CRUD operations for all entities

import {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
} from '@/lib/firebase/helpers';

/**
 * Base service class implementing Repository Pattern
 * All entity-specific services should extend this class
 * @template T - The entity type
 */
export class BaseService<T> {
  protected collectionPath: string;

  constructor(collectionPath: string) {
    this.collectionPath = collectionPath;
  }

  /**
   * Create a new document in the collection
   * @param data - The data to create (without id)
   * @returns The ID of the created document
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    return createDocument<T>(this.collectionPath, data);
  }

  /**
   * Get a document by ID
   * @param id - The document ID
   * @returns The document or null if not found
   */
  async getById(id: string): Promise<T | null> {
    return getDocument<T>(this.collectionPath, id);
  }

  /**
   * Update a document
   * @param id - The document ID
   * @param data - Partial data to update
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    return updateDocument<T>(this.collectionPath, id, data);
  }

  /**
   * Delete a document
   * @param id - The document ID
   */
  async delete(id: string): Promise<void> {
    return deleteDocument(this.collectionPath, id);
  }

  /**
   * Query documents with optional constraints
   * @param constraints - Firestore query constraints (where, orderBy, limit, etc.)
   * @returns Array of documents matching the query
   */
  async query(constraints: any[] = []): Promise<T[]> {
    return queryDocuments<T>(this.collectionPath, constraints);
  }

  /**
   * Get all documents in the collection
   * @returns Array of all documents
   */
  async getAll(): Promise<T[]> {
    return this.query([]);
  }
}
