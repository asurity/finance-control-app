// useCategories hook - React Query hooks for category management
// Income and expense category operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryService } from '@/lib/services/category.service';
import { Category, CategoryType } from '@/types/firestore';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export function useCategories() {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const service = currentOrgId ? new CategoryService(currentOrgId) : null;

  // Query: Get all categories
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['categories', currentOrgId],
    queryFn: async () => {
      if (!service) return [];
      return service.getAllSorted();
    },
    enabled: !!currentOrgId,
  });

  // Mutation: Create category
  const createMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id'>) => {
      if (!service) throw new Error('Organization not set');
      return service.createWithValidation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentOrgId] });
      toast.success('Categoría creada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Mutation: Update category
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => {
      if (!service) throw new Error('Organization not set');
      return service.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentOrgId] });
      toast.success('Categoría actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Mutation: Delete category
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!service) throw new Error('Organization not set');
      return service.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentOrgId] });
      toast.success('Categoría eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    categories: categories || [],
    isLoading,
    error,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for categories by type
export function useCategoriesByType(type: CategoryType) {
  const { currentOrgId } = useOrganization();

  return useQuery({
    queryKey: ['categories-by-type', currentOrgId, type],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const service = new CategoryService(currentOrgId);
      return service.getByType(type);
    },
    enabled: !!currentOrgId,
  });
}

// Hook for income categories
export function useIncomeCategories() {
  return useCategoriesByType('INCOME');
}

// Hook for expense categories
export function useExpenseCategories() {
  return useCategoriesByType('EXPENSE');
}

// Hook to seed default categories
export function useSeedCategories() {
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error('Organization not set');
      const service = new CategoryService(currentOrgId);
      await service.seedDefaultCategories();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentOrgId] });
      toast.success('Categorías predeterminadas creadas');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear categorías: ${error.message}`);
    },
  });
}
