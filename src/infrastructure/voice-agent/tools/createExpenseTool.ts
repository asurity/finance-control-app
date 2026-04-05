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
  date: z.string().optional(), // Fecha en formato ISO o relativa (ej: "ayer", "hace 2 días")
  notes: z.string().optional(),
});

type CreateExpenseArgs = z.infer<typeof CreateExpenseArgsSchema>;

/**
 * Parsea una fecha relativa o ISO a un objeto Date
 * Soporta: "hoy", "ayer", "hace X días", "hace X semanas", formatos ISO
 */
function parseRelativeDate(dateString?: string): Date {
  if (!dateString) return new Date();
  
  const today = new Date();
  const normalizedDate = dateString.toLowerCase().trim();
  
  // Hoy
  if (normalizedDate === 'hoy') {
    return today;
  }
  
  // Ayer
  if (normalizedDate === 'ayer') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  // Hace X días
  const daysMatch = normalizedDate.match(/hace\s+(\d+)\s+d[ií]as?/);
  if (daysMatch) {
    const daysAgo = parseInt(daysMatch[1]);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }
  
  // Hace X semanas
  const weeksMatch = normalizedDate.match(/hace\s+(\d+)\s+semanas?/);
  if (weeksMatch) {
    const weeksAgo = parseInt(weeksMatch[1]);
    const date = new Date(today);
    date.setDate(date.getDate() - (weeksAgo * 7));
    return date;
  }
  
  // Intentar parsear como fecha ISO
  try {
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (error) {
    // Ignorar error de parseo
  }
  
  // Por defecto, retornar hoy
  return today;
}

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
        date: {
          type: 'string',
          description: 'Fecha del gasto. Si el usuario menciona "ayer", usar "ayer". Si dice "hace 3 días", usar "hace 3 días". Si no menciona nada, omitir este campo (se asume hoy). Ejemplos: "ayer", "hoy", "hace 2 días", "hace 1 semana".',
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

      // Parsear la fecha (si se proporciona)
      const transactionDate = parseRelativeDate(validatedArgs.date);

      // Ejecutar el Use Case
      const result = await createTransactionUseCase.execute({
        type: 'EXPENSE',
        amount: validatedArgs.amount,
        description: validatedArgs.description,
        categoryId: validatedArgs.categoryId,
        accountId: validatedArgs.accountId,
        userId: context.userId,
        date: transactionDate,
        notes: validatedArgs.notes,
      });

      return {
        success: true,
        data: result,
        message: 'Registrado',
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
          message: 'Cuenta sin saldo. ¿Usar otra?',
        };
      }

      return {
        success: false,
        message: 'Error. Intenta de nuevo',
      };
    }
  },
};
