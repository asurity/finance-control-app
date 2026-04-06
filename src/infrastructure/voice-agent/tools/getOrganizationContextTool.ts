/**
 * Tool: Get Organization Context
 * Obtiene el contexto de la organización activa del usuario
 * Este tool debe ejecutarse PRIMERO en cada comando para obtener el organizationId
 */

import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';

/**
 * Tool para obtener el contexto organizacional del usuario
 * Retorna: organizationId, organizationName, número de cuentas y categorías
 */
export const getOrganizationContextTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'get_organization_context',
    description: 'Obtiene el contexto de la organización activa del usuario. DEBE ejecutarse como PRIMER paso en cada comando para obtener el organizationId necesario para las demás operaciones.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context: VoiceToolContext
  ): Promise<VoiceToolResult> {
    try {
      // El orgId ya viene en el contexto del VoiceProvider
      const { orgId, userId } = context;

      if (!orgId) {
        return {
          success: false,
          message: 'No hay una organización activa seleccionada',
        };
      }

      // Obtener información adicional del contexto
      const accountRepo = context.container.getAccountRepository();
      const categoryRepo = context.container.getCategoryRepository();

      // Contar recursos disponibles
      const accounts = await accountRepo.getAll();
      const categories = await categoryRepo.getAll();

      const activeAccounts = accounts.filter(acc => acc.isActive);
      const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');
      const incomeCategories = categories.filter(cat => cat.type === 'INCOME');

      return {
        success: true,
        data: {
          organizationId: orgId,
          userId,
          stats: {
            totalAccounts: activeAccounts.length,
            debitAccounts: activeAccounts.filter(acc => 
              acc.type === 'CHECKING' || acc.type === 'SAVINGS' || acc.type === 'CASH'
            ).length,
            creditCards: activeAccounts.filter(acc => acc.type === 'CREDIT_CARD').length,
            expenseCategories: expenseCategories.length,
            incomeCategories: incomeCategories.length,
          },
        },
        message: `Organización activa: ${activeAccounts.length} cuentas, ${expenseCategories.length} categorías de gasto`,
      };
    } catch (error) {
      console.error('[getOrganizationContextTool] Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener contexto organizacional',
      };
    }
  },
};
