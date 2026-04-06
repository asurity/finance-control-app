/**
 * VoiceMetrics — Sistema de telemetría y métricas para el asistente de voz
 * 
 * Responsabilidades:
 * - Capturar métricas de performance (connection, recording, tool execution)
 * - Trackear success/error rates
 * - Integración con analytics externos
 * - Debugging en desarrollo
 */

/**
 * Métrica individual del sistema de voz
 */
interface VoiceMetric {
  /** Nombre de la métrica */
  name: string;
  /** Valor numérico de la métrica */
  value: number;
  /** Timestamp en ms */
  timestamp: number;
  /** Metadata adicional (opcional) */
  metadata?: Record<string, any>;
}

/**
 * Singleton para gestión de métricas del sistema de voz
 */
class VoiceMetrics {
  private static instance: VoiceMetrics;
  private metrics: VoiceMetric[] = [];

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): VoiceMetrics {
    if (!VoiceMetrics.instance) {
      VoiceMetrics.instance = new VoiceMetrics();
    }
    return VoiceMetrics.instance;
  }

  /**
   * Registra una métrica
   * 
   * @param name - Nombre de la métrica
   * @param value - Valor numérico
   * @param metadata - Información contextual adicional
   */
  track(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: VoiceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Log en console en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[VoiceMetric] ${name}:`, value, metadata || '');
    }

    // Enviar a analytics si está habilitado
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(`voice_${name}`, {
        value,
        ...metadata,
      });
    }
  }

  /**
   * Obtiene todas las métricas registradas
   */
  getMetrics(): VoiceMetric[] {
    return [...this.metrics];
  }

  /**
   * Calcula el promedio de una métrica por nombre
   * 
   * @param name - Nombre de la métrica
   * @returns Promedio de valores o 0 si no hay datos
   */
  getAverageByName(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / filtered.length);
  }

  /**
   * Obtiene el total de una métrica por nombre
   * 
   * @param name - Nombre de la métrica
   * @returns Suma de valores
   */
  getTotalByName(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    return filtered.reduce((acc, m) => acc + m.value, 0);
  }

  /**
   * Obtiene las últimas N métricas de un tipo
   * 
   * @param name - Nombre de la métrica
   * @param count - Número de métricas a retornar
   */
  getLastN(name: string, count: number): VoiceMetric[] {
    const filtered = this.metrics.filter(m => m.name === name);
    return filtered.slice(-count);
  }

  /**
   * Limpia todas las métricas almacenadas
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Obtiene un resumen de métricas para debugging
   */
  getSummary(): Record<string, any> {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    
    return uniqueNames.reduce((acc, name) => {
      acc[name] = {
        total: this.getTotalByName(name),
        average: this.getAverageByName(name),
        count: this.metrics.filter(m => m.name === name).length,
      };
      return acc;
    }, {} as Record<string, any>);
  }
}

/**
 * Instancia singleton de VoiceMetrics
 */
export const voiceMetrics = VoiceMetrics.getInstance();

/**
 * Helper para medir duración de operaciones
 * 
 * Uso:
 * ```typescript
 * const endTimer = startTimer('connection');
 * await connectToService();
 * endTimer(); // Registra 'connection_duration_ms'
 * ```
 */
export function startTimer(label: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    voiceMetrics.track(`${label}_duration_ms`, Math.round(duration));
  };
}

/**
 * Nombres de métricas del sistema de voz
 */
export const VOICE_METRICS = {
  // Conexión
  CONNECTION_DURATION_MS: 'connection_duration_ms',
  CONNECTION_SUCCESS: 'connection_success',
  CONNECTION_ERROR: 'connection_error',
  
  // Grabación
  RECORDING_DURATION_MS: 'recording_duration_ms',
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  
  // Ejecución de tools
  TOOL_EXECUTION_DURATION_MS: 'tool_execution_duration_ms',
  TOOL_SUCCESS: 'tool_success',
  TOOL_ERROR: 'tool_error',
  
  // Sesión
  COMMANDS_PER_SESSION: 'commands_per_session',
  SESSION_DURATION_MS: 'session_duration_ms',
  
  // Errores
  ERROR_MICROPHONE_PERMISSION: 'error_microphone_permission',
  ERROR_MICROPHONE_NOT_FOUND: 'error_microphone_not_found',
  ERROR_NETWORK: 'error_network',
  ERROR_UNKNOWN: 'error_unknown',
} as const;
