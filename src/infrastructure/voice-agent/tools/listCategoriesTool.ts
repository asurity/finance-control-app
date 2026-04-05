/**
 * Tool: List Categories
 * Lista todas las categorías disponibles del usuario
 * Fase 2: Tool Declarations
 */

import { z } from 'zod';
import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { GetCategoriesByTypeUseCase } from '@/domain/use-cases/categories/GetCategoriesByTypeUseCase';
import { CategoryType } from '@/types/firestore';

/**
 * Schema de validación para los argumentos del tool
 */
const ListCategoriesArgsSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
});

type ListCategoriesArgs = z.infer<typeof ListCategoriesArgsSchema>;

/**
 * Tool para listar las categorías del usuario vía comando de voz
 */
export const listCategoriesTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'list_categories',
    description: 'Lista todas las categorías disponibles del usuario. Usa esta función cuando el usuario quiere ver sus categorías de ingresos o gastos.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de categorías a listar: "income" para ingresos, "expense" para gastos. Si no se especifica, lista todas.',
          enum: ['income', 'expense'],
        },
      },
      required: [],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context: VoiceToolContext
  ): Promise<VoiceToolResult> {
    try {
      // Validar argumentos con Zod
      const validatedArgs = ListCategoriesArgsSchema.parse(args);

      // Si especificó tipo, usar el Use Case de filtrado
      if (validatedArgs.type) {
        const getCategoriesByTypeUseCase = context.container.getGetCategoriesByTypeUseCase();
        // Convertir a mayúsculas para el Use Case
        const categoryType = validatedArgs.type === 'income' ? 'INCOME' : 'EXPENSE';
        const result = await getCategoriesByTypeUseCase.execute({ type: categoryType as 'INCOME' | 'EXPENSE' });
        const categories = result.categories;

        if (categories.length === 0) {
          return {
            success: true,
            data: [],
            message: `No tienes categorías de ${validatedArgs.type === 'income' ? 'ingresos' : 'gastos'}`,
          };
        }

        const typeLabel = validatedArgs.type === 'income' ? 'ingresos' : 'gastos';
        const categoriesForAI = categories.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }));

        return {
          success: true,
          data: categoriesForAI,
          message: `Encontré ${categories.length} categorías de ${typeLabel}. Usa el campo 'id' para create_expense.`,
        };
      }

      // Si no especificó tipo, listar todas
      const categoryRepo = context.container.getCategoryRepository();
      const allCategories = await categoryRepo.getAll();

      if (allCategories.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No tienes categorías registradas',
        };
      }

      const categoriesForAI = allCategories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));

      return {
        success: true,
        data: categoriesForAI,
        message: `Encontré ${allCategories.length} categorías. Usa el campo 'id' para create_expense.`,
      };
    } catch (error) {
      console.error('Error en listCategoriesTool:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => issue.message).join(', ');
        return {
          success: false,
          message: `Error de validación: ${validationErrors}`,
        };
      }

      return {
        success: false,
        message: 'No pude listar las categorías. Intenta nuevamente.',
      };
    }
  },
};
