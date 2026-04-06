/**
 * Voice Agent Tools Registry - Fase Optimizada
 * ENFOQUE: Quick Expense/Income con inferencia inteligente
 * 
 * Tools activos:
 * - get_organization_context: Obtener contexto organizacional (PASO 0)
 * - list_accounts: Contexto interno (cuentas disponibles)
 * - list_categories: Contexto interno (categorías disponibles)
 * - create_expense: Registro rápido de gastos
 * - create_income: Registro rápido de ingresos
 */

import { VoiceToolRegistry } from '../VoiceToolRegistry';
import { getOrganizationContextTool } from './getOrganizationContextTool';
import { createExpenseTool } from './createExpenseTool';
import { createIncomeTool } from './createIncomeTool';
import { listAccountsTool } from './listAccountsTool';
import { listCategoriesTool } from './listCategoriesTool';

/**
 * Registra todas las herramientas en el VoiceToolRegistry
 * Esta función debe ser llamada una vez al inicio de la aplicación
 */
export function registerAllTools(): void {
  const registry = VoiceToolRegistry.getInstance();

  // Limpiar registro previo (útil en desarrollo con HMR)
  registry.clear();

  // PASO 0: Contexto organizacional (debe ejecutarse primero siempre)
  registry.register('get_organization_context', getOrganizationContextTool);

  // PASO 1: Herramientas de contexto (para inferencia inteligente)
  registry.register('list_accounts', listAccountsTool);
  registry.register('list_categories', listCategoriesTool);

  // PASO 2: Herramientas principales (Quick Expense/Income)
  registry.register('create_expense', createExpenseTool);
  registry.register('create_income', createIncomeTool);

  // console.log(`[VoiceAgent] ${registry.count()} tools registrados`);
}

/**
 * Exporta todas las herramientas individuales para testing
 */
export {
  getOrganizationContextTool,
  createExpenseTool,
  createIncomeTool,
  listAccountsTool,
  listCategoriesTool,
};

/**
 * Exporta el registry para uso en la aplicación
 */
export { VoiceToolRegistry };
