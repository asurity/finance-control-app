/**
 * Voice Usage Entity
 * Representa el uso del Voice Agent por usuario
 */

export interface VoiceCommandLog {
  /** Timestamp del comando */
  timestamp: Date;
  
  /** Transcripción del comando de voz */
  transcription: string;
  
  /** Herramientas ejecutadas en este comando */
  toolsExecuted: string[];
  
  /** Tokens consumidos en este comando */
  tokensUsed: number;
  
  /** Si el comando se ejecutó exitosamente */
  success: boolean;
  
  /** Mensaje de error si falló */
  errorMessage?: string;
}

export interface VoiceUsageDaily {
  /** ID del usuario */
  userId: string;
  
  /** Fecha en formato YYYY-MM-DD */
  date: string;
  
  /** Comandos usados en este día */
  commandsUsed: number;
  
  /** Total de tokens consumidos en este día */
  totalTokens: number;
  
  /** Historial de comandos ejecutados */
  commands: VoiceCommandLog[];
  
  /** Timestamp de creación */
  createdAt: Date;
  
  /** Timestamp de última actualización */
  updatedAt: Date;
}

export interface VoiceUsageStats {
  /** Total de comandos usados hoy */
  commandsToday: number;
  
  /** Total de tokens consumidos hoy */
  tokensToday: number;
  
  /** Comandos restantes hoy */
  commandsRemaining: number;
  
  /** Hora de reset (medianoche siguiente) */
  resetAt: Date;
}
