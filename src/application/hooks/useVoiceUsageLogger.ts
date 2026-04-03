/**
 * Hook para registrar el uso del Voice Agent
 * Persiste logs de comandos ejecutados en Firestore
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FirestoreVoiceUsageRepository } from '@/infrastructure/repositories/FirestoreVoiceUsageRepository';
import type { VoiceCommandLog } from '@/domain/entities/VoiceUsage';

const voiceUsageRepo = new FirestoreVoiceUsageRepository();

/**
 * Convierte una fecha Date a formato YYYY-MM-DD
 */
function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useVoiceUsageLogger() {
  const { user } = useAuth();

  /**
   * Registra un comando ejecutado en Firestore
   */
  const logCommand = useCallback(
    async (commandLog: Omit<VoiceCommandLog, 'timestamp'>) => {
      if (!user) {
        console.warn('[useVoiceUsageLogger] No hay usuario autenticado');
        return;
      }

      const today = dateToString(new Date());

      const fullLog: VoiceCommandLog = {
        ...commandLog,
        timestamp: new Date(),
      };

      try {
        await voiceUsageRepo.logCommand(user.id, today, fullLog);
      } catch (error) {
        // Log el error pero no fallar (mejor UX)
        console.error('[useVoiceUsageLogger] Error al guardar log:', error);
      }
    },
    [user]
  );

  return { logCommand };
}
