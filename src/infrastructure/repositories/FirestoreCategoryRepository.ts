import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category, CategoryType } from '@/types/firestore';
import { CategoryMapper } from '@/infrastructure/mappers/CategoryMapper';
import { DEFAULT_CATEGORIES } from '@/lib/constants/defaultCategories';

/**
 * Firestore implementation of Category Repository
 */
export class FirestoreCategoryRepository implements ICategoryRepository {
  private collectionPath: string;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.collectionPath = 'categories';
  }

  async create(data: Omit<Category, 'id'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = { ...CategoryMapper.toFirestore(data), orgId: this.orgId };
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }

  async getById(id: string): Promise<Category | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return CategoryMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(filters?: Record<string, any>): Promise<Category[]> {
    try {
      const ref = collection(db, this.collectionPath);
      // Query without orderBy to avoid composite index requirement
      const q = query(ref, where('orgId', '==', this.orgId));
      const snapshot = await getDocs(q);

      const categories = snapshot.docs.map((doc) =>
        CategoryMapper.toDomain({ id: doc.id, ...doc.data() })
      );

      // Sort by name in memory
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[CategoryRepo] ERROR querying categories:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Category>): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    const firestoreData = CategoryMapper.toFirestoreUpdate(data);
    await updateDoc(docRef, firestoreData);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionPath, id);
    await deleteDoc(docRef);
  }

  async exists(id: string): Promise<boolean> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  async getByType(type: CategoryType): Promise<Category[]> {
    try {
      const ref = collection(db, this.collectionPath);
      // Query without orderBy to avoid composite index requirement
      const q = query(ref, where('orgId', '==', this.orgId), where('type', '==', type));

      const snapshot = await getDocs(q);
      const categories = snapshot.docs.map((doc) =>
        CategoryMapper.toDomain({ id: doc.id, ...doc.data() })
      );

      // Sort by name in memory
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[CategoryRepo] ERROR querying categories by type:', error);
      throw error;
    }
  }

  async getDefaultCategories(): Promise<Category[]> {
    // Return default categories from constants without IDs
    return DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      id: '', // Will be assigned when created
    }));
  }

  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = this.getDefaultCategories();

    for (const category of await defaultCategories) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...categoryData } = category;
      await this.create(categoryData);
    }
  }

  async isInUse(categoryId: string): Promise<boolean> {
    // Note: This would require checking transactions
    // For now, return false - should be implemented by querying transactions
    return false;
  }

  async getUsageStats(
    categoryId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    // Note: This would require accessing transactions
    // For now, return zeros - should be implemented by a use case
    return {
      transactionCount: 0,
      totalAmount: 0,
      averageAmount: 0,
    };
  }

  async getSubcategories(parentId: string): Promise<Category[]> {
    try {
      const ref = collection(db, this.collectionPath);
      const q = query(
        ref,
        where('orgId', '==', this.orgId),
        where('parentId', '==', parentId)
      );
      const snapshot = await getDocs(q);
      const categories = snapshot.docs.map((d) =>
        CategoryMapper.toDomain({ id: d.id, ...d.data() })
      );
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[CategoryRepo] ERROR querying subcategories:', error);
      throw error;
    }
  }
}
