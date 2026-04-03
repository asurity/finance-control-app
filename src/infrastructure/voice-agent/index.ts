/**
 * Voice Agent Infrastructure Module
 * Punto de entrada para el módulo del Agente de Voz
 */

// Tipos principales (legacy + agnósticos)
export type {
  VoiceAgentState,
  VoiceTool,
  VoiceToolContext,
  VoiceToolResult,
  OpenAIToolDeclaration,
  OpenAIParameterSchema,
} from './types';

// Tipos agnósticos (domain ports)
export type {
  IAIRealtimeProvider,
  AIProviderState,
  AIFunctionCall,
  AIToolDeclaration,
  AISessionConfig,
  AIProviderType,
} from '@/domain/ports/IAIRealtimeProvider';

// Proveedores
export { OpenAIRealtimeProvider } from './OpenAIRealtimeProvider';
export { AIProviderFactory } from './AIProviderFactory';
export { ToolDeclarationMapper } from './ToolDeclarationMapper';

// Backward compat
export { RealtimeClient } from './RealtimeClient';

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
  listAccountsTool,
  listCategoriesTool,
} from './tools';
