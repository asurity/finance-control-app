/**
 * Category Validators
 * Zod schemas for category input validation
 */

import { z } from 'zod';
import type { TransactionType, CategoryType } from '@/types/firestore';

/**
 * Schema for creating a new category
 */
export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  userId: z.string().min(1),
  icon: z.string().optional().default('📁'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#6B7280'),
  description: z.string().max(200).optional(),
  parentCategoryId: z.string().min(1).optional(),
  isActive: z.boolean().default(true),
});

/**
 * Schema for updating an existing category
 */
export const UpdateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(50).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  description: z.string().max(200).optional(),
  parentCategoryId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for filtering categories by type
 */
export const GetCategoriesByTypeSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  includeInactive: z.boolean().default(false),
  includeSystem: z.boolean().default(true),
});

/**
 * Schema for category hierarchy
 */
export const GetCategoryHierarchySchema = z.object({
  parentId: z
    .string()
    .optional()
    .describe('ID de categoría padre (omitir para obtener categorías raíz)'),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Profundidad máxima de la jerarquía'),
});

/**
 * Schema for category usage statistics
 */
export const CategoryUsageSchema = z.object({
  categoryId: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
);

/**
 * Schema for deleting a category
 */
export const DeleteCategorySchema = z.object({
  categoryId: z.string().min(1),
  force: z.boolean().default(false),
  replacementCategoryId: z.string().min(1).optional(),
}).refine(
  (data) => {
    if (!data.force && !data.replacementCategoryId) {
      return false;
    }
    return true;
  },
  {
    message: 'Debe proporcionar una categoría de reemplazo o usar force=true',
    path: ['replacementCategoryId'],
  }
);

// Type exports
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type GetCategoriesByTypeInput = z.infer<typeof GetCategoriesByTypeSchema>;
export type GetCategoryHierarchyInput = z.infer<typeof GetCategoryHierarchySchema>;
export type CategoryUsageInput = z.infer<typeof CategoryUsageSchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>;
