/**
 * Category Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { CategoryType } from '@/types/firestore';

export class Category {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: CategoryType,
    public readonly icon: string,
    public readonly color: string,
    public readonly isSystem?: boolean // System categories cannot be deleted
  ) {
    this.validate();
  }

  /**
   * Validates category business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (this.name.length > 50) {
      throw new Error('Category name cannot exceed 50 characters');
    }

    if (!this.icon || this.icon.trim().length === 0) {
      throw new Error('Category icon is required');
    }

    if (!this.color || this.color.trim().length === 0) {
      throw new Error('Category color is required');
    }

    // Validate color format (hex code)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(this.color)) {
      throw new Error('Category color must be a valid hex code (e.g., #FF5733)');
    }
  }

  /**
   * Checks if category can be deleted
   * System categories cannot be deleted
   */
  canBeDeleted(): boolean {
    return this.isSystem !== true;
  }

  /**
   * Checks if category can be edited
   * System categories have limited editing capabilities
   */
  canBeEdited(): boolean {
    return this.isSystem !== true;
  }

  /**
   * Checks if category is for expenses
   */
  isExpenseCategory(): boolean {
    return this.type === 'EXPENSE';
  }

  /**
   * Checks if category is for income
   */
  isIncomeCategory(): boolean {
    return this.type === 'INCOME';
  }

  /**
   * Checks if this is a system-defined category
   */
  isSystemCategory(): boolean {
    return this.isSystem === true;
  }

  /**
   * Checks if this is a user-defined category
   */
  isUserCategory(): boolean {
    return this.isSystem !== true;
  }
}
