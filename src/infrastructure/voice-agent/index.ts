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

// Tipos nuevos (domain ports - IVoiceProvider)
export type {
  IVoiceProvider,
  VoiceProviderState,
  FunctionCall,
  ToolDeclaration,
  VoiceSessionConfig,
  VoiceProviderType,
} from '@/domain/ports/IVoiceProvider';

// Backward compatibility types (deprecated)
// Removed because they don't exist in IVoiceProvider anymore.

// Proveedor activo
export { GeminiVoiceProvider } from './GeminiVoiceProvider';

// Factory
export { VoiceProviderFactory } from './VoiceProviderFactory';

// Mappers
export { ToolDeclarationMapper } from './ToolDeclarationMapper';

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
