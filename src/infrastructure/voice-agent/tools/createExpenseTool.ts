/**
 * Tool: Create Expense
 * Crea un gasto en la aplicación mediante comando de voz
 * Fase 2: Tool Declarations
 */

import { z } from 'zod';
import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { CreateTransactionUseCase } from '@/domain/use-cases/transactions/CreateTransactionUseCase';

/**
 * Schema de validación para los argumentos del tool
 */
const CreateExpenseArgsSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1, 'La descripción es requerida'),
  categoryId: z.string().min(1, 'El ID de categoría es requerido'),
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
  notes: z.string().optional(),
});

type CreateExpenseArgs = z.infer<typeof CreateExpenseArgsSchema>;

/**
 * Tool para crear un gasto vía comando de voz
 */
export const createExpenseTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'create_expense',
    description: 'Crea un nuevo gasto en la aplicación. Usa esta función cuando el usuario quiere registrar un gasto, compra, pago o egreso.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Monto del gasto en pesos chilenos (sin decimales). Ejemplo: 15000 para $15.000',
        },
        description: {
          type: 'string',
          description: 'Descripción narrativa del gasto (3-8 palabras). Debe incluir contexto mencionado por el usuario. Ejemplos: "Café en Starbucks durante la mañana", "Almuerzo con equipo en centro", "Compra semanal en Jumbo". Si no hay contexto, usar solo categoría: "Café", "Almuerzo".',
        },
        categoryId: {
          type: 'string',
          description: 'ID de la categoría del gasto. Usar las categorías disponibles del contexto del usuario.',
        },
        accountId: {
          type: 'string',
          description: 'ID de la cuenta desde la que se realiza el gasto. Usar las cuentas disponibles del contexto del usuario.',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales opcionales sobre el gasto',
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
      const validatedArgs = CreateExpenseArgsSchema.parse(args);

      // Obtener el Use Case del DIContainer
      const createTransactionUseCase = context.container.getCreateTransactionUseCase();

      // Ejecutar el Use Case
      const result = await createTransactionUseCase.execute({
        type: 'EXPENSE',
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
        message: `Gasto de ${formattedAmount} registrado en ${validatedArgs.description}`,
      };
    } catch (error) {
      console.error('Error en createExpenseTool:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => issue.message).join(', ');
        return {
          success: false,
          message: `Error de validación: ${validationErrors}`,
        };
      }

      // Error de saldo insuficiente
      if (error instanceof Error && error.message === 'Insufficient balance') {
        return {
          success: false,
          message: 'La cuenta seleccionada no tiene saldo suficiente. Pregúntale al usuario si quiere usar otra cuenta o registrar el gasto de todas formas.',
        };
      }

      return {
        success: false,
        message: 'No pude registrar el gasto. Intenta nuevamente.',
      };
    }
  },
};
