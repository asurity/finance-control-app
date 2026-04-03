/**
 * Tool: Create Income
 * Crea un ingreso en la aplicación mediante comando de voz
 * Fase 2: Tool Declarations
 */

import { z } from 'zod';
import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { CreateTransactionUseCase } from '@/domain/use-cases/transactions/CreateTransactionUseCase';

/**
 * Schema de validación para los argumentos del tool
 */
const CreateIncomeArgsSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1, 'La descripción es requerida'),
  categoryId: z.string().min(1, 'El ID de categoría es requerido'),
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
  notes: z.string().optional(),
});

type CreateIncomeArgs = z.infer<typeof CreateIncomeArgsSchema>;

/**
 * Tool para crear un ingreso vía comando de voz
 */
export const createIncomeTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'create_income',
    description: 'Crea un nuevo ingreso en la aplicación. Usa esta función cuando el usuario quiere registrar un ingreso, ganancia, cobro o entrada de dinero.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Monto del ingreso en pesos chilenos (sin decimales). Ejemplo: 50000 para $50.000',
        },
        description: {
          type: 'string',
          description: 'Descripción breve del ingreso. Ejemplo: "Sueldo", "Freelance", "Venta"',
        },
        categoryId: {
          type: 'string',
          description: 'ID de la categoría del ingreso. Usar las categorías de tipo ingreso del contexto del usuario.',
        },
        accountId: {
          type: 'string',
          description: 'ID de la cuenta donde se recibe el ingreso. Usar las cuentas disponibles del contexto del usuario.',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales opcionales sobre el ingreso',
        },
      },
      required: ['amount', 'description', 'categoryId', 'accountId'],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context: VoiceToolContext
  ): Promise<VoiceToolResult> {
    try {
      // Validar argumentos con Zod
      const validatedArgs = CreateIncomeArgsSchema.parse(args);

      // Obtener el Use Case del DIContainer
      const createTransactionUseCase = context.container.getCreateTransactionUseCase();

      // Ejecutar el Use Case
      const result = await createTransactionUseCase.execute({
        type: 'INCOME',
        amount: validatedArgs.amount,
        description: validatedArgs.description,
        categoryId: validatedArgs.categoryId,
        accountId: validatedArgs.accountId,
        userId: context.userId,
        date: new Date(),
        notes: validatedArgs.notes,
      });

      // Formatear monto para el mensaje
      const formattedAmount = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(validatedArgs.amount);

      return {
        success: true,
        data: result,
        message: `Ingreso de ${formattedAmount} registrado en ${validatedArgs.description}`,
      };
    } catch (error) {
      console.error('Error en createIncomeTool:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => issue.message).join(', ');
        return {
          success: false,
          message: `Error de validación: ${validationErrors}`,
        };
      }

      return {
        success: false,
        message: 'No pude registrar el ingreso. Intenta nuevamente.',
      };
    }
  },
};
