/**
 * Base repository interface
 *
 * Provides common CRUD operations for all entities.
 * All specific repositories should extend this interface.
 *
 * @template T - The entity type
 */
export interface IRepository<T> {
  /**
   * Creates a new entity
   * @param data - Entity data without ID
   * @returns Promise resolving to the created entity's ID
   */
  create(data: Omit<T, 'id'>): Promise<string>;

  /**
   * Retrieves an entity by ID
   * @param id - Entity ID
   * @returns Promise resolving to the entity or null if not found
   */
  getById(id: string): Promise<T | null>;

  /**
   * Retrieves all entities matching optional filters
   * @param filters - Optional filter criteria
   * @returns Promise resolving to array of entities
   */
  getAll(filters?: Record<string, any>): Promise<T[]>;

  /**
   * Updates an entity
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @returns Promise resolving when update is complete
   */
  update(id: string, data: Partial<T>): Promise<void>;

  /**
   * Deletes an entity
   * @param id - Entity ID
   * @returns Promise resolving when deletion is complete
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if an entity exists
   * @param id - Entity ID
   * @returns Promise resolving to true if entity exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}
