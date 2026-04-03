/**
 * Tipos e interfaces del módulo de Voice Agent
 * Fase 1: Tipos actualizados para modelo de comandos
 */

// TODO: Implementar en Fase 2
export interface VoiceTool {
  declaration: unknown; // OpenAIToolDeclaration
  execute: (args: Record<string, unknown>, context: VoiceToolContext) => Promise<VoiceToolResult>;
}

export interface VoiceToolContext {
  orgId: string;
  userId: string;
  container: unknown; // DIContainer
}

export interface VoiceToolResult {
  success: boolean;
  data?: unknown;
  message: string;
}

/**
 * Estados del agente de voz (modelo de comandos)
 * - idle: Esperando que el usuario presione el botón
 * - recording: Grabando comando de voz (max 15s)
 * - processing: OpenAI transcribiendo y analizando intención
 * - executing: Ejecutando function calls y use cases
 * - error: Error en cualquier parte del flujo
 */
export type VoiceAgentState = 
  | 'idle' 
  | 'recording' 
  | 'processing' 
  | 'executing' 
  | 'error';
