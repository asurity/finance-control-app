/**
 * Voice Agent Infrastructure Module
 * Punto de entrada para el módulo del Agente de Voz
 * Fase 2: Tool Declarations
 */

// Tipos principales
export type {
  VoiceAgentState,
  VoiceTool,
  VoiceToolContext,
  VoiceToolResult,
  OpenAIToolDeclaration,
  OpenAIParameterSchema,
} from './types';

// Configuración
export {
  VOICE_LIMITS,
  VOICE_AGENT_CONFIG,
  buildSystemInstructions,
} from './config';

// Registry y herramientas
export {
  VoiceToolRegistry,
  registerAllTools,
  createExpenseTool,
  createIncomeTool,
  getBalanceTool,
  getDashboardSummaryTool,
  listAccountsTool,
  listCategoriesTool,
  navigateToTool,
} from './tools';
