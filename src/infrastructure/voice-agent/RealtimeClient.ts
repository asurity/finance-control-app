/**
 * RealtimeClient — Backward compatibility re-export
 * @deprecated Usar OpenAIRealtimeProvider directamente o IAIRealtimeProvider como interfaz
 * 
 * Este archivo mantiene compatibilidad con código existente que importa RealtimeClient.
 * Se eliminará en FASE 8 (limpieza final).
 */

export { OpenAIRealtimeProvider as RealtimeClient } from './OpenAIRealtimeProvider';

// Re-export tipos de la interfaz agnóstica como aliases de los tipos legacy
export type { AIProviderState as RealtimeClientState } from '@/domain/ports/IAIRealtimeProvider';
export type { AIFunctionCall as RealtimeFunctionCall } from '@/domain/ports/IAIRealtimeProvider';
export type { AISessionConfig as RealtimeSessionConfig } from '@/domain/ports/IAIRealtimeProvider';
