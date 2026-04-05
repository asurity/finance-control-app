/**
 * Tool: List Accounts
 * Lista todas las cuentas disponibles del usuario
 * Fase 2: Tool Declarations
 */

import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { IAccountRepository } from '@/domain/repositories/IAccountRepository';

/**
 * Tool para listar las cuentas del usuario vía comando de voz
 */
export const listAccountsTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'list_accounts',
    description: 'Lista todas las cuentas disponibles del usuario con sus saldos. Usa esta función cuando el usuario quiere ver todas sus cuentas o no especifica cuál.',
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
      // Obtener el repositorio del DIContainer
      const accountRepo = context.container.getAccountRepository();

      // Obtener todas las cuentas
      const accounts = await accountRepo.getAll();

      if (accounts.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No tienes cuentas registradas',
        };
      }

      // Formatear para que el modelo use los IDs correctamente
      // Devolvemos un array simple con id, name, balance
      const accountsForAI = accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
      }));

      return {
        success: true,
        data: accountsForAI,
        message: `Encontré ${accounts.length} cuentas disponibles. Usa el campo 'id' para create_expense.`,
      };
    } catch (error) {
      console.error('Error en listAccountsTool:', error);

      return {
        success: false,
        message: 'No pude listar las cuentas. Intenta nuevamente.',
      };
    }
  },
};
