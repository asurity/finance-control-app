/**
 * Tipos e interfaces del módulo de Voice Agent
 * Fase 0: Setup inicial
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

export type VoiceAgentState = 
  | 'idle' 
  | 'connecting' 
  | 'connected' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'error';
