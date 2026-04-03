/**
 * useVoiceAgent - Hook principal del agente de voz
 * Fase 4: Refactorizado para multi-turno con push-to-talk
 * 
 * Hook que consume el VoiceProvider context y expone
 * una interfaz limpia para que los componentes interactúen
 * con el agente de voz conversacional.
 */

import { useVoiceContext, VoiceAgentState } from '@/components/voice/VoiceProvider';
import type { ConversationMessage } from '@/components/voice/VoiceConversationHistory';

export interface UseVoiceAgent {
  // Estado
  state: VoiceAgentState;
  isAvailable: boolean;
  isSessionActive: boolean;
  isModalOpen: boolean;

  // Acciones multi-turno
  openModal: () => void;
  closeModal: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  endSession: () => void;

  // Datos
  transcript: string;
  response: string;
  error: string | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
  conversationHistory: ConversationMessage[];

  // Flags derivados
  isActive: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isExecuting: boolean;
  isConversing: boolean;
  hasError: boolean;

  // Backward compat (deprecados)
  startCommand: () => Promise<void>;
  cancelCommand: () => void;
  forceCommitAudio: () => void;
}

/**
 * Hook principal para interactuar con el agente de voz
 * Debe usarse dentro de un VoiceProvider
 */
export function useVoiceAgent(): UseVoiceAgent {
  const context = useVoiceContext();

  // Flags derivados
  const isActive = context.state !== 'idle';
  const isRecording = context.state === 'recording';
  const isProcessing = context.state === 'processing';
  const isExecuting = context.state === 'executing';
  const isConversing = context.isSessionActive && context.state !== 'idle';
  const hasError = context.state === 'error';

  return {
    // Estado
    state: context.state,
    isAvailable: context.isAvailable,
    isSessionActive: context.isSessionActive,
    isModalOpen: context.isModalOpen,

    // Acciones multi-turno
    openModal: context.openModal,
    closeModal: context.closeModal,
    startRecording: context.startRecording,
    stopRecording: context.stopRecording,
    endSession: context.endSession,

    // Datos
    transcript: context.transcript,
    response: context.response,
    error: context.error,
    commandsRemainingToday: context.commandsRemainingToday,
    recordingTimeLeft: context.recordingTimeLeft,
    conversationHistory: context.conversationHistory,

    // Flags derivados
    isActive,
    isRecording,
    isProcessing,
    isExecuting,
    isConversing,
    hasError,

    // Backward compat
    startCommand: context.startCommand,
    cancelCommand: context.cancelCommand,
    forceCommitAudio: context.forceCommitAudio,
  };
}
