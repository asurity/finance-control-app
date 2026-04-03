/**
 * Tool: Get Balance
 * Consulta el saldo de una cuenta específica
 * Fase 2: Tool Declarations
 */

import { z } from 'zod';
import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { GetAccountByIdUseCase } from '@/domain/use-cases/accounts/GetAccountByIdUseCase';

/**
 * Schema de validación para los argumentos del tool
 */
const GetBalanceArgsSchema = z.object({
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
});

type GetBalanceArgs = z.infer<typeof GetBalanceArgsSchema>;

/**
 * Tool para consultar el saldo de una cuenta vía comando de voz
 */
export const getBalanceTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'get_balance',
    description: 'Consulta el saldo actual de una cuenta específica. Usa esta función cuando el usuario pregunta cuánto dinero tiene en una cuenta.',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID de la cuenta a consultar. Usar las cuentas disponibles del contexto del usuario.',
        },
      },
      required: ['accountId'],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context: VoiceToolContext
  ): Promise<VoiceToolResult> {
    try {
      // Validar argumentos con Zod
      const validatedArgs = GetBalanceArgsSchema.parse(args);

      // Obtener el Use Case del DIContainer
      const getAccountByIdUseCase = context.container.getGetAccountByIdUseCase();

      // Ejecutar el Use Case
      const result = await getAccountByIdUseCase.execute({ accountId: validatedArgs.accountId });
      const account = result.account;

      if (!account) {
        return {
          success: false,
          message: 'No encontré esa cuenta',
        };
      }

      // Formatear saldo para el mensaje
      const formattedBalance = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(account.balance);

      return {
        success: true,
        data: { balance: account.balance, accountName: account.name },
        message: `Tienes ${formattedBalance} en ${account.name}`,
      };
    } catch (error) {
      console.error('Error en getBalanceTool:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => issue.message).join(', ');
        return {
          success: false,
          message: `Error de validación: ${validationErrors}`,
        };
      }

      return {
        success: false,
        message: 'No pude consultar el saldo. Intenta nuevamente.',
      };
    }
  },
};
