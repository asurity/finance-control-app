/**
 * VoiceErrorHandler - Sistema de manejo de errores del asistente de voz
 * 
 * Convierte errores técnicos en mensajes amigables con acciones de recuperación
 */

export interface VoiceError {
  code: string;
  message: string;
  description?: string;
  recoveryAction?: {
    label: string;
    handler: () => void;
  };
}

export class VoiceErrorHandler {
  /**
   * Maneja un error y lo convierte en un VoiceError estructurado
   */
  static handle(error: Error): VoiceError {
    // Permiso de micrófono denegado
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      return {
        code: 'MICROPHONE_PERMISSION_DENIED',
        message: 'Micrófono bloqueado',
        description: 'El navegador bloqueó el acceso al micrófono',
        recoveryAction: {
          label: 'Ver cómo habilitarlo',
          handler: () => {
            window.open('https://support.google.com/chrome/answer/2693767', '_blank');
          },
        },
      };
    }

    // Micrófono no encontrado
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return {
        code: 'MICROPHONE_NOT_FOUND',
        message: 'Micrófono no detectado',
        description: 'Conecta un micrófono y recarga la página',
      };
    }

    // Browser no soporta Web Speech API
    if (error.message.includes('no soporta')) {
      return {
        code: 'BROWSER_NOT_SUPPORTED',
        message: 'Navegador no compatible',
        description: 'Usa Chrome, Edge o Safari para comandos de voz',
      };
    }

    // No se detectó audio
    if (error.message.includes('No se detectó audio')) {
      return {
        code: 'NO_AUDIO_DETECTED',
        message: 'No te escuché',
        description: 'Habla más fuerte o acércate al micrófono',
      };
    }

    // Saldo insuficiente
    if (error.message.includes('Insufficient balance')) {
      return {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Saldo insuficiente',
        description: 'La cuenta no tiene fondos suficientes',
      };
    }

    // Error de red
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Error de conexión',
        description: 'Verifica tu internet e intenta nuevamente',
        recoveryAction: {
          label: 'Reintentar',
          handler: () => window.location.reload(),
        },
      };
    }

    // Límite diario alcanzado
    if (error.message.includes('Límite diario alcanzado')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Límite diario alcanzado',
        description: error.message,
      };
    }

    // Sesión expirada
    if (error.message.includes('Sesión expirada')) {
      return {
        code: 'SESSION_EXPIRED',
        message: 'Sesión expirada',
        description: 'Por favor, inicia sesión nuevamente',
        recoveryAction: {
          label: 'Ir a login',
          handler: () => {
            window.location.href = '/login';
          },
        },
      };
    }

    // Servicio no disponible
    if (error.message.includes('temporalmente no disponible')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Servicio no disponible',
        description: 'El servicio de voz está temporalmente fuera de línea',
      };
    }

    // Error genérico
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Error inesperado',
      description: error.message || 'Intenta nuevamente en unos segundos',
    };
  }
}
