/**
 * Tool: Navigate To
 * Navega a una sección específica de la aplicación
 * Fase 2: Tool Declarations
 */

import { z } from 'zod';
import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';

/**
 * Rutas disponibles en la aplicación
 */
const AVAILABLE_ROUTES = {
  dashboard: '/dashboard',
  transactions: '/transactions',
  accounts: '/accounts',
  budgets: '/budgets',
  reports: '/reports',
  savings: '/savings',
  recurring: '/recurring',
  notifications: '/notifications',
  settings: '/settings',
} as const;

type RouteName = keyof typeof AVAILABLE_ROUTES;

/**
 * Schema de validación para los argumentos del tool
 */
const NavigateToArgsSchema = z.object({
  section: z.enum([
    'dashboard',
    'transactions',
    'accounts',
    'budgets',
    'reports',
    'savings',
    'recurring',
    'notifications',
    'settings',
  ] as const),
});

type NavigateToArgs = z.infer<typeof NavigateToArgsSchema>;

/**
 * Tool para navegar a diferentes secciones vía comando de voz
 * Nota: Este tool retorna la ruta a la que navegar, el hook debe manejar la navegación
 */
export const navigateToTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'navigate_to',
    description: 'Navega a una sección específica de la aplicación. Usa esta función cuando el usuario quiere ir a otra página o ver una sección diferente.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: 'Sección a la que navegar',
          enum: [
            'dashboard',
            'transactions',
            'accounts',
            'budgets',
            'reports',
            'savings',
            'recurring',
            'notifications',
            'settings',
          ],
        },
      },
      required: ['section'],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context: VoiceToolContext
  ): Promise<VoiceToolResult> {
    try {
      // Validar argumentos con Zod
      const validatedArgs = NavigateToArgsSchema.parse(args);

      const route = AVAILABLE_ROUTES[validatedArgs.section];

      const sectionNames: Record<RouteName, string> = {
        dashboard: 'Panel Principal',
        transactions: 'Transacciones',
        accounts: 'Cuentas',
        budgets: 'Presupuestos',
        reports: 'Reportes',
        savings: 'Ahorros',
        recurring: 'Transacciones Recurrentes',
        notifications: 'Notificaciones',
        settings: 'Configuración',
      };

      return {
        success: true,
        data: { route, section: validatedArgs.section },
        message: `Navegando a ${sectionNames[validatedArgs.section]}`,
      };
    } catch (error) {
      console.error('Error en navigateToTool:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => issue.message).join(', ');
        return {
          success: false,
          message: `Error de validación: ${validationErrors}`,
        };
      }

      return {
        success: false,
        message: 'No pude navegar a esa sección. Intenta nuevamente.',
      };
    }
  },
};
