/**
 * useVoiceLogger — Hook para logging transparente del sistema de voz
 * 
 * Principios:
 * - Desacoplado: VoiceProvider no sabe de logging
 * - Transparente: Se puede agregar/quitar sin afectar la lógica
 * - Extensible: Fácil agregar más listeners
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceUsageLogger } from './useVoiceUsageLogger';

/**
 * Datos de un comando de voz ejecutado
 */
export interface VoiceCommandLog {
  /** Transcripción del comando */
  transcription: string;
  /** Tools ejecutados */
  toolsExecuted: string[];
  /** Tokens usados (estimado) */
  tokensUsed: number;
  /** Éxito o fallo */
  success: boolean;
  /** Mensaje de error (si aplicable) */
  errorMessage?: string;
  /** Timestamp de ejecución */
  timestamp?: number;
}

/**
 * Hook para logging de comandos de voz
 * 
 * Uso:
 * ```tsx
 * const { logCommand } = useVoiceLogger();
 * 
 * await logCommand({
 *   transcription: 'registra un café de 5 lucas',
 *   toolsExecuted: ['create_expense'],
 *   tokensUsed: 600,
 *   success: true,
 * });
 * ```
 */
export function useVoiceLogger() {
  const { user } = useAuth();
  const { logCommand: logCommandToFirebase } = useVoiceUsageLogger();

  /**
   * Registra un comando de voz ejecutado
   */
  const logCommand = useCallback(
    async (data: VoiceCommandLog) => {
      if (!user) {
        console.warn('[useVoiceLogger] No user logged in, skipping log');
        return;
      }

      // Log en console en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[VoiceCommand]', {
          user: user.id,
          ...data,
          timestamp: data.timestamp || Date.now(),
        });
      }

      // Log en Firebase
      try {
        await logCommandToFirebase(user.id, {
          transcription: data.transcription,
          toolsExecuted: data.toolsExecuted,
          tokensUsed: data.tokensUsed,
          success: data.success,
          errorMessage: data.errorMessage,
        });
      } catch (error) {
        console.error('[useVoiceLogger] Error logging to Firebase:', error);
        // No throw - logging no debe romper el flujo principal
      }
    },
    [user, logCommandToFirebase]
  );

  /**
   * Registra un error del sistema de voz
   */
  const logError = useCallback(
    async (errorCode: string, errorMessage: string) => {
      if (!user) return;

      // Log en console
      console.error('[VoiceError]', { user: user.id, errorCode, errorMessage });

      // Log a Firebase como comando fallido
      try {
        await logCommandToFirebase(user.id, {
          transcription: '',
          toolsExecuted: [],
          tokensUsed: 0,
          success: false,
          errorMessage: `[${errorCode}] ${errorMessage}`,
        });
      } catch (error) {
        console.error('[useVoiceLogger] Error logging error to Firebase:', error);
      }
    },
    [user, logCommandToFirebase]
  );

  return {
    logCommand,
    logError,
  };
}
