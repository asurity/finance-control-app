import { useState } from 'react';
import { toast } from 'sonner';
import { useCategories } from './useCategories';
import { CATEGORY_TEMPLATES, validateTemplatePercentages } from '@/lib/constants/categoryTemplates';
import type { CreateCategoryDTO } from '../dto/CategoryDTO';
import type { Category } from '@/types/firestore';

export interface TemplateApplicationResult {
  success: boolean;
  categoriesCreated: number;
  categoriesSkipped: number;
  duplicateNames: string[];
  errors: string[];
}

export function useCategoryTemplates(orgId: string) {
  const { useAllCategories, createCategory } = useCategories(orgId);
  const { data: categories } = useAllCategories();
  const [isApplying, setIsApplying] = useState(false);

  /**
   * Aplica un template de categorías de manera segura.
   * 
   * GARANTÍAS DE SEGURIDAD:
   * - Solo AGREGA nuevas categorías (nunca modifica ni elimina existentes)
   * - Valida nombres duplicados antes de crear
   * - Muestra resultados detallados de la operación
   * - Maneja errores sin afectar categorías existentes
   */
  const applyTemplate = async (
    templateKey: string
  ): Promise<TemplateApplicationResult> => {
    setIsApplying(true);
    
    const result: TemplateApplicationResult = {
      success: false,
      categoriesCreated: 0,
      categoriesSkipped: 0,
      duplicateNames: [],
      errors: []
    };

    try {
      // Validar que el template existe
      const template = CATEGORY_TEMPLATES[templateKey];
      if (!template) {
        result.errors.push('Template no encontrado');
        toast.error('El template seleccionado no existe');
        return result;
      }

      // Validar que los porcentajes sumen 100%
      if (!validateTemplatePercentages(templateKey)) {
        result.errors.push('Los porcentajes del template no suman 100%');
        toast.error('Los porcentajes del template son inválidos');
        return result;
      }

      // Obtener nombres de categorías existentes (case-insensitive)
      const existingNames = new Set(
        categories?.map((cat: Category) => cat.name.toLowerCase().trim()) || []
      );

      // Filtrar categorías que no existen aún
      const categoriesToCreate = template.categories.filter(cat => {
        const nameNormalized = cat.name.toLowerCase().trim();
        if (existingNames.has(nameNormalized)) {
          result.categoriesSkipped++;
          result.duplicateNames.push(cat.name);
          return false;
        }
        return true;
      });

      // Si no hay categorías nuevas que crear
      if (categoriesToCreate.length === 0) {
        toast(`Todas las categorías del template "${template.name}" ya existen en tu organización`);
        result.success = true;
        return result;
      }

      // Crear las categorías nuevas
      for (const categoryData of categoriesToCreate) {
        try {
          await createCategory.mutateAsync({
            name: categoryData.name,
            type: categoryData.type,
            color: categoryData.color,
            icon: categoryData.icon || '🏷️',
            orgId: orgId,
            isSystem: false,
            parentId: undefined
          });
          
          result.categoriesCreated++;
        } catch (error) {
          console.error(`Error creando categoría ${categoryData.name}:`, error);
          result.errors.push(`Falló al crear: ${categoryData.name}`);
        }
      }

      // Mostrar resultado final
      if (result.categoriesCreated > 0) {
        const successMessage = result.categoriesSkipped > 0
          ? `Se crearon ${result.categoriesCreated} categorías nuevas. ${result.categoriesSkipped} ya existían y se omitieron.`
          : `Se crearon ${result.categoriesCreated} categorías del template "${template.name}" exitosamente`;

        toast.success(successMessage);
        result.success = true;
      }

      if (result.errors.length > 0 && result.categoriesCreated === 0) {
        toast.error('No se pudo crear ninguna categoría. Revisa la consola para más detalles.');
      }

    } catch (error) {
      console.error('Error aplicando template:', error);
      result.errors.push(error instanceof Error ? error.message : 'Error desconocido');
      toast.error('Ocurrió un error al aplicar el template');
    } finally {
      setIsApplying(false);
    }

    return result;
  };

  /**
   * Obtiene información previa sobre qué categorías se crearían
   * sin ejecutar la operación (para mostrar preview)
   */
  const getTemplatePreview = (templateKey: string) => {
    const template = CATEGORY_TEMPLATES[templateKey];
    if (!template) return null;

    const existingNames = new Set(
      categories?.map((cat: Category) => cat.name.toLowerCase().trim()) || []
    );

    const newCategories = template.categories.filter(
      cat => !existingNames.has(cat.name.toLowerCase().trim())
    );

    const duplicateCategories = template.categories.filter(
      cat => existingNames.has(cat.name.toLowerCase().trim())
    );

    return {
      template,
      totalInTemplate: template.categories.length,
      newCategories: newCategories.length,
      duplicates: duplicateCategories.length,
      duplicateNames: duplicateCategories.map(c => c.name),
      existingCategoriesCount: categories?.length || 0
    };
  };

  return {
    applyTemplate,
    getTemplatePreview,
    isApplying,
    templates: CATEGORY_TEMPLATES
  };
}
