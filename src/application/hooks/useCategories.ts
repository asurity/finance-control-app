/**
 * useCategories Hook - Clean Architecture
 * React Query hook for category operations using Use Cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { Category, CategoryType } from '@/types/firestore';
import { toast } from 'sonner';

/**
 * Category query keys factory
 */
export const categoryKeys = {
  all: (orgId: string) => ['categories', orgId] as const,
  byType: (orgId: string, type: CategoryType) => ['categories', orgId, 'type', type] as const,
};

/**
 * Hook for category operations
 */
export function useCategories(orgId: string) {
  const queryClient = useQueryClient();
  const container = DIContainer.getInstance();
  
  // Set organization ID in DI container
  container.setOrgId(orgId);

  // Get repository
  const categoryRepo = container.getCategoryRepository();

  // ========================================
  // Queries
  // ========================================

  /**
   * Query: Get all categories
   */
  const useAllCategories = () => {
    return useQuery({
      queryKey: categoryKeys.all(orgId),
      queryFn: () => categoryRepo.getAll(),
    });
  };

  /**
   * Query: Get categories by type
   */
  const useCategoriesByType = (type: CategoryType) => {
    return useQuery({
      queryKey: categoryKeys.byType(orgId, type),
      queryFn: () => categoryRepo.getByType(type),
      enabled: !!type,
    });
  };

  // ========================================
  // Mutations
  // ========================================

  /**
   * Mutation: Create category
   */
  const createCategory = useMutation({
    mutationFn: (data: Omit<Category, 'id'>) => categoryRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) });
      toast.success('Categoría creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear categoría: ${error.message}`);
    },
  });

  /**
   * Mutation: Update category
   */
  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) });
      toast.success('Categoría actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  /**
   * Mutation: Delete category
   */
  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoryRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) });
      toast.success('Categoría eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  /**
   * Mutation: Seed default categories
   */
  const seedCategories = useMutation({
    mutationFn: async (userId: string) => {
      const seedUseCase = container.getSeedDefaultCategoriesUseCase();
      await seedUseCase.execute({ userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) });
      toast.success('Categorías inicializadas correctamente');
    },
  });

  return {
    // Queries
    useAllCategories,
    useCategoriesByType,
    
    // Mutations
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories,
  };
}
