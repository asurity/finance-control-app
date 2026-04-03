/**
 * useVoiceAgent - Hook principal del agente de voz
 * Fase 4: Hook y Context
 * 
 * Hook que consume el VoiceProvider context y expone
 * una interfaz limpia para que los componentes interactúen
 * con el agente de voz.
 * 
 * Uso:
 * ```tsx
 * const {
 *   state,
 *   isAvailable,
 *   startCommand,
 *   cancelCommand,
 *   transcript,
 *   response,
 *   error,
 *   commandsRemainingToday,
 *   recordingTimeLeft
 * } = useVoiceAgent();
 * ```
 */

import { useVoiceContext, VoiceAgentState } from '@/components/voice/VoiceProvider';

/**
 * Interfaz del hook useVoiceAgent
 */
export interface UseVoiceAgent {
  /**
   * Estado actual del agente de voz
   * - 'idle': Sin actividad
   * - 'connecting': Estableciendo conexión con OpenAI
   * - 'ready': Conectado, esperando comando de voz
   * - 'recording': Grabando audio del usuario (15s max)
   * - 'processing': OpenAI procesando el audio y transcribiendo
   * - 'executing': Ejecutando function calls (acciones)
   * - 'error': Error en el flujo
   */
  state: VoiceAgentState;

  /**
   * Indica si el agente de voz está disponible para usar
   * Verifica: usuario autenticado + org seleccionada + comandos restantes > 0
   */
  isAvailable: boolean;

  /**
   * Inicia un comando de voz
   * - Solicita ephemeral token al API route
   * - Establece conexión WebRTC con OpenAI
   * - Comienza grabación de audio (máx 15s)
   */
  startCommand: () => Promise<void>;

  /**
   * Cancela el comando de voz en curso
   * - Detiene grabación
   * - Cierra conexión WebRTC
   * - Resetea estado a 'idle'
   */
  cancelCommand: () => void;

  /**
   * Fuerza el commit del audio buffer actual
   * Útil cuando el usuario terminó de hablar pero el VAD no detectó el silencio
   */
  forceCommitAudio: () => void;

  /**
   * Transcripción del comando del usuario
   * Se actualiza en tiempo real mientras habla
   */
  transcript: string;

  /**
   * Respuesta de la IA en formato texto
   * (NO hay audio de salida, solo texto)
   */
  response: string;

  /**
   * Mensaje de error si algo falla
   * null si no hay error
   */
  error: string | null;

  /**
   * Comandos restantes hoy (0-10)
   * Rate limit: 10 comandos/día por usuario
   */
  commandsRemainingToday: number;

  /**
   * Tiempo restante de grabación en segundos (15 → 0)
   * Cuenta regresiva durante el estado 'recording'
   */
  recordingTimeLeft: number;

  /**
   * Indica si hay un comando en curso
   * (cualquier estado excepto 'idle')
   */
  isActive: boolean;

  /**
   * Indica si está grabando actualmente
   */
  isRecording: boolean;

  /**
   * Indica si está procesando (post-grabación)
   */
  isProcessing: boolean;

  /**
   * Indica si está ejecutando acciones
   */
  isExecuting: boolean;

  /**
   * Indica si hay un error
   */
  hasError: boolean;
}

/**
 * Hook principal para interactuar con el agente de voz
 * Debe usarse dentro de un VoiceProvider
 */
export function useVoiceAgent(): UseVoiceAgent {
  const context = useVoiceContext();

  // Flags derivados para facilitar uso en componentes
  const isActive = context.state !== 'idle';
  const isRecording = context.state === 'recording';
  const isProcessing = context.state === 'processing';
  const isExecuting = context.state === 'executing';
  const hasError = context.state === 'error';

  return {
    // Estado base del context
    state: context.state,
    isAvailable: context.isAvailable,
    startCommand: context.startCommand,
    cancelCommand: context.cancelCommand,
    forceCommitAudio: context.forceCommitAudio,
    transcript: context.transcript,
    response: context.response,
    error: context.error,
    commandsRemainingToday: context.commandsRemainingToday,
    recordingTimeLeft: context.recordingTimeLeft,

    // Flags derivados
    isActive,
    isRecording,
    isProcessing,
    isExecuting,
    hasError,
  };
}
