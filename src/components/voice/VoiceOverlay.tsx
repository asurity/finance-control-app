/**
 * @deprecated Reemplazado por VoiceModal en FASE 3 del refactor conversacional.
 * Se mantiene temporalmente por backward compatibility.
 * Eliminar en FASE 8 (limpieza final).
 * 
 * VoiceOverlay - Overlay visual durante comandos de voz
 * Fase 5: Componentes UI
 * 
 * Muestra:
 * - Contador regresivo (15s → 0s)
 * - Transcripción en vivo
 * - Estado actual del proceso
 * - Respuesta de la IA (texto)
 * - Botón cancelar (solo durante grabación)
 * - Cierre automático después de completar
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Mic, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';
import { Button } from '@/components/ui/button';

interface VoiceOverlayProps {
  onClose: () => void;
}

export function VoiceOverlay({ onClose }: VoiceOverlayProps) {
  const {
    state,
    transcript,
    response,
    error,
    recordingTimeLeft,
    commandsRemainingToday,
    cancelCommand,
    forceCommitAudio,
  } = useVoiceAgent();

  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-cerrar después de completar o error
  useEffect(() => {
    if (state === 'executing') {
      const delay = 2000;
      
      const timer = setTimeout(() => {
        onClose();
      }, delay);

      setAutoCloseTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    };
  }, [state, onClose]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [autoCloseTimer]);

  const handleCancel = () => {
    cancelCommand();
    onClose();
  };

  // Determinar mensaje de estado
  const getStatusMessage = () => {
    switch (state) {
      case 'connecting':
        return '🔌 Conectando con IA...';
      case 'ready':
        return '✔️ Listo - Háblame ahora';
      case 'recording':
        return '🎤 Escuchando...';
      case 'processing':
        return '⚙️ Procesando tu comando...';
      case 'executing':
        return '✓ Ejecutando acción...';
      case 'error':
        return '⚠️ Error';
      default:
        return '';
    }
  };

  // Determinar icono para el estado
  const getStatusIcon = () => {
    switch (state) {
      case 'ready':
        return <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />;
      case 'recording':
        return <Mic className="h-8 w-8 animate-pulse" />;
      case 'processing':
      case 'connecting':
        return <Loader2 className="h-8 w-8 animate-spin" />;
      case 'executing':
        return <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        // Cerrar al hacer clic fuera solo si no está grabando
        if (e.target === e.currentTarget && state !== 'recording') {
          handleCancel();
        }
      }}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6',
          'transform transition-all duration-300 ease-out',
          'animate-in fade-in zoom-in-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con estado y botón cerrar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold">{getStatusMessage()}</h3>
              {state === 'ready' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Empieza a hablar cuando estés listo
                </p>
              )}
              {state === 'recording' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Habla claramente y de forma concisa
                </p>
              )}
            </div>
          </div>

          {/* Botón cerrar (siempre visible) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contador regresivo (solo durante grabación) */}
        {state === 'recording' && (
          <div className="flex flex-col items-center justify-center py-6">
            <div
              className={cn(
                'text-6xl font-bold tabular-nums transition-colors',
                recordingTimeLeft <= 5 ? 'text-destructive' : 'text-primary'
              )}
            >
              {recordingTimeLeft}s
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Tiempo restante
            </div>

            {/* Barra de progreso */}
            <div className="w-full mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-1000 ease-linear',
                  recordingTimeLeft <= 5 ? 'bg-destructive' : 'bg-primary'
                )}
                style={{
                  width: `${(recordingTimeLeft / 15) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Transcripción en vivo */}
        {transcript && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Transcripción:
            </p>
            <div
              className="bg-muted/50 rounded-lg p-4 min-h-[60px]"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm leading-relaxed">{transcript}</p>
            </div>
          </div>
        )}

        {/* Respuesta de la IA */}
        {response && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Respuesta:
            </p>
            <div
              className="bg-primary/10 border border-primary/20 rounded-lg p-4"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm leading-relaxed text-foreground">{response}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && state === 'error' && (
          <div className="space-y-2">
            <div
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
              role="alert"
            >
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Footer con información adicional */}
        {state !== 'error' && (
          <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
            <p className="text-xs text-muted-foreground">
              {commandsRemainingToday} comando{commandsRemainingToday !== 1 ? 's' : ''} restante
              {commandsRemainingToday !== 1 ? 's' : ''} hoy
            </p>

            <div className="flex items-center gap-2">
              {/* Botón Enviar (durante grabación) */}
              {state === 'recording' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={forceCommitAudio}
                  className="h-8"
                >
                  Enviar
                </Button>
              )}

              {/* Botón Finalizar Sesión (siempre visible excepto en error) */}
              {(state === 'ready' || state === 'recording' || state === 'processing') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8"
                >
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
