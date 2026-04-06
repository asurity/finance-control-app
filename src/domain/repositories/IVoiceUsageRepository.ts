/**
 * Voice Usage Repository Interface
 * Gestiona el uso del Voice Agent en Firestore
 */

import { VoiceUsageDaily, VoiceCommandLog, VoiceUsageStats } from '../entities/VoiceUsage';

export interface IVoiceUsageRepository {
  /**
   * Obtiene el uso de voz para un usuario en una fecha específica
   * @param userId - ID del usuario
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Uso del día o null si no existe
   */
  getDailyUsage(userId: string, date: string): Promise<VoiceUsageDaily | null>;

  /**
   * Incrementa el contador de comandos para un usuario en una fecha
   * @param userId - ID del usuario
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Comandos usados después del incremento
   */
  incrementCommandCount(userId: string, date: string): Promise<number>;

  /**
   * Guarda el log de un comando ejecutado
   * @param userId - ID del usuario
   * @param date - Fecha en formato YYYY-MM-DD
   * @param commandLog - Información del comando ejecutado
   */
  logCommand(userId: string, date: string, commandLog: VoiceCommandLog): Promise<void>;

  /**
   * Obtiene las estadísticas de uso actuales para un usuario
   * @param userId - ID del usuario
   * @param maxCommandsPerDay - Límite de comandos por día
   * @returns Estadísticas de uso
   */
  getUsageStats(userId: string, maxCommandsPerDay: number): Promise<VoiceUsageStats>;

  /**
   * Obtiene el historial de comandos de un usuario en un rango de fechas
   * @param userId - ID del usuario
   * @param startDate - Fecha inicio (YYYY-MM-DD)
   * @param endDate - Fecha fin (YYYY-MM-DD)
   * @returns Array de uso diario
   */
  getUsageHistory(userId: string, startDate: string, endDate: string): Promise<VoiceUsageDaily[]>;
}
