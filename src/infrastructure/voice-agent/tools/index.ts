/**
 * Voice Agent Tools Registry
 * Exporta y registra todas las herramientas disponibles para el agente de voz
 * Fase 2: Tool Declarations
 */

import { VoiceToolRegistry } from '../VoiceToolRegistry';
import { createExpenseTool } from './createExpenseTool';
import { createIncomeTool } from './createIncomeTool';
import { getBalanceTool } from './getBalanceTool';
import { getDashboardSummaryTool } from './getDashboardSummaryTool';
import { listAccountsTool } from './listAccountsTool';
import { listCategoriesTool } from './listCategoriesTool';
import { navigateToTool } from './navigateToTool';

/**
 * Registra todas las herramientas en el VoiceToolRegistry
 * Esta función debe ser llamada una vez al inicio de la aplicación
 */
export function registerAllTools(): void {
  const registry = VoiceToolRegistry.getInstance();

  // Limpiar registro previo (útil en desarrollo con HMR)
  registry.clear();

  // Registrar herramientas de transacciones
  registry.register('create_expense', createExpenseTool);
  registry.register('create_income', createIncomeTool);

  // Registrar herramientas de consulta
  registry.register('get_balance', getBalanceTool);
  registry.register('get_dashboard_summary', getDashboardSummaryTool);
  registry.register('list_accounts', listAccountsTool);
  registry.register('list_categories', listCategoriesTool);

  // Registrar herramienta de navegación
  registry.register('navigate_to', navigateToTool);

  console.log(`[VoiceAgent] ${registry.count()} tools registrados`);
}

/**
 * Exporta todas las herramientas individuales para testing
 */
export {
  createExpenseTool,
  createIncomeTool,
  getBalanceTool,
  getDashboardSummaryTool,
  listAccountsTool,
  listCategoriesTool,
  navigateToTool,
};

/**
 * Exporta el registry para uso en la aplicación
 */
export { VoiceToolRegistry };
