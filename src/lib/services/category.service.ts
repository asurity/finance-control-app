// Category Service - Manage income and expense categories
// Handles category CRUD and custom user categories

import { BaseService } from './base.service';
import { Category, CategoryType } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';

export class CategoryService extends BaseService<Category> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/categories`);
  }

  /**
   * Get categories by type (INCOME or EXPENSE)
   */
  async getByType(type: CategoryType): Promise<Category[]> {
    return this.query([where('type', '==', type), orderBy('name', 'asc')]);
  }

  /**
   * Get income categories
   */
  async getIncomeCategories(): Promise<Category[]> {
    return this.getByType('INCOME');
  }

  /**
   * Get expense categories
   */
  async getExpenseCategories(): Promise<Category[]> {
    return this.getByType('EXPENSE');
  }

  /**
   * Get all categories sorted by name
   */
  async getAllSorted(): Promise<Category[]> {
    return this.query([orderBy('name', 'asc')]);
  }

  /**
   * Search categories by name
   */
  async searchByName(searchTerm: string): Promise<Category[]> {
    const allCategories = await this.getAllSorted();
    const lowerSearch = searchTerm.toLowerCase();
    return allCategories.filter((cat) => cat.name.toLowerCase().includes(lowerSearch));
  }

  /**
   * Check if category name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const categories = await this.getAllSorted();
    return categories.some(
      (cat) => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
    );
  }

  /**
   * Create category with validation
   */
  async createWithValidation(categoryData: Omit<Category, 'id'>): Promise<string> {
    // Check if name already exists
    const exists = await this.nameExists(categoryData.name);
    if (exists) {
      throw new Error(`Ya existe una categoría con el nombre "${categoryData.name}"`);
    }

    return this.create(categoryData);
  }

  /**
   * Seed default categories for a new organization
   */
  async seedDefaultCategories(): Promise<void> {
    const defaultCategories: Omit<Category, 'id'>[] = [
      // Income categories
      { name: 'Salario', type: 'INCOME', icon: '💰', color: '#00B894' },
      { name: 'Inversiones', type: 'INCOME', icon: '📈', color: '#6C5CE7' },
      { name: 'Ventas', type: 'INCOME', icon: '💵', color: '#00B894' },
      { name: 'Bonos', type: 'INCOME', icon: '🎁', color: '#00B894' },
      { name: 'Otros ingresos', type: 'INCOME', icon: '💸', color: '#00B894' },

      // Expense categories - Household
      { name: 'Alimentación', type: 'EXPENSE', icon: '🍔', color: '#FF6B6B' },
      { name: 'Vivienda', type: 'EXPENSE', icon: '🏠', color: '#96CEB4' },
      { name: 'Servicios básicos', type: 'EXPENSE', icon: '💡', color: '#74B9FF' },

      // Expense categories - Transportation
      { name: 'Transporte', type: 'EXPENSE', icon: '🚗', color: '#4ECDC4' },
      { name: 'Combustible', type: 'EXPENSE', icon: '⛽', color: '#FD79A8' },

      // Expense categories - Personal
      { name: 'Salud', type: 'EXPENSE', icon: '💊', color: '#45B7D1' },
      { name: 'Educación', type: 'EXPENSE', icon: '🎓', color: '#DFE6E9' },
      { name: 'Entretenimiento', type: 'EXPENSE', icon: '🎬', color: '#FFEAA7' },
      { name: 'Ropa', type: 'EXPENSE', icon: '👕', color: '#A29BFE' },

      // Expense categories - Business
      { name: 'Gastos de negocio', type: 'EXPENSE', icon: '💼', color: '#636E72' },
      { name: 'Marketing', type: 'EXPENSE', icon: '📢', color: '#55EFC4' },
      { name: 'Equipamiento', type: 'EXPENSE', icon: '🖥️', color: '#81ECEC' },

      // Expense categories - Financial
      { name: 'Ahorros', type: 'EXPENSE', icon: '🏦', color: '#FAB1A0' },
      { name: 'Inversiones', type: 'EXPENSE', icon: '📊', color: '#6C5CE7' },
      { name: 'Seguros', type: 'EXPENSE', icon: '🛡️', color: '#B2BEC3' },
      { name: 'Impuestos', type: 'EXPENSE', icon: '📝', color: '#2D3436' },

      // Expense categories - Others
      { name: 'Regalos', type: 'EXPENSE', icon: '🎁', color: '#FD79A8' },
      { name: 'Mascotas', type: 'EXPENSE', icon: '🐕', color: '#FDCB6E' },
      { name: 'Otros gastos', type: 'EXPENSE', icon: '❓', color: '#B2BEC3' },
    ];

    // Check if categories already exist
    const existing = await this.getAll();
    if (existing.length > 0) {
      console.log('Categories already seeded');
      return;
    }

    // Create all default categories
    const promises = defaultCategories.map((cat) => this.create(cat));
    await Promise.all(promises);

    console.log(`Seeded ${defaultCategories.length} default categories`);
  }
}
