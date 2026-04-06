/**
 * Tool: Get Dashboard Summary
 * Consulta un resumen de las estadísticas financieras del usuario
 * Fase 2: Tool Declarations
 */

import { VoiceTool, VoiceToolContext, VoiceToolResult } from '../types';
import { GetDashboardStatisticsUseCase } from '@/domain/use-cases/dashboard/GetDashboardStatisticsUseCase';

/**
 * Tool para obtener resumen del dashboard vía comando de voz
 */
export const getDashboardSummaryTool: VoiceTool = {
  declaration: {
    type: 'function',
    name: 'get_dashboard_summary',
    description: 'Obtiene un resumen de las estadísticas financieras del usuario: balance total, ingresos del mes, gastos del mes. Usa esta función cuando el usuario pregunta "cuánto he gastado", "cuánto gané", o pide un resumen general.',
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
      // Obtener el Use Case del DIContainer
      const getDashboardStatisticsUseCase = context.container.getGetDashboardStatisticsUseCase();

      // Ejecutar el Use Case (usando período mensual por defecto)
      const stats = await getDashboardStatisticsUseCase.execute({ 
        userId: context.userId,
        period: 'month'
      });

      // Formatear montos
      const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
        }).format(amount);

      const currentBalance = formatCurrency(stats.currentBalance);
      const totalIncome = formatCurrency(stats.totalIncome);
      const totalExpenses = formatCurrency(stats.totalExpenses);

      return {
        success: true,
        data: stats,
        message: `Balance actual: ${currentBalance}. Total: ${totalIncome} de ingresos y ${totalExpenses} de gastos`,
      };
    } catch (error) {
      console.error('Error en getDashboardSummaryTool:', error);

      return {
        success: false,
        message: 'No pude obtener el resumen. Intenta nuevamente.',
      };
    }
  },
};
