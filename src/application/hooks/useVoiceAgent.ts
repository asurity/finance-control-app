/**
 * Hook principal del Voice Agent
 * Fase 0: Setup inicial - Stub
 */

import { VoiceAgentState } from '@/infrastructure/voice-agent/types';

/**
 * Hook para interactuar con el agente de voz
 * TODO: Implementar completamente en Fase 4
 */
export function useVoiceAgent() {
  // TODO: Implementar en Fase 4
  return {
    state: 'idle' as VoiceAgentState,
    isAvailable: false,
    startSession: async () => {
      console.warn('Voice Agent not implemented yet');
    },
    endSession: () => {
      console.warn('Voice Agent not implemented yet');
    },
    transcript: '',
    agentMessage: '',
    error: null,
  };
}
