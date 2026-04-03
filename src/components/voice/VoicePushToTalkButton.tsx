/**
 * VoicePushToTalkButton - Botón push-to-talk grande para el modal de voz
 * 
 * Botón circular que:
 * - onPointerDown → inicia grabación
 * - onPointerUp / onPointerLeave → detiene grabación
 * - Muestra estados visuales según el estado del agente
 */

'use client';

import { useCallback, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceAgentState } from './VoiceProvider';

interface VoicePushToTalkButtonProps {
  state: VoiceAgentState;
  recordingTimeLeft: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function VoicePushToTalkButton({
  state,
  recordingTimeLeft,
  onStartRecording,
  onStopRecording,
  disabled = false,
}: VoicePushToTalkButtonProps) {
  const isPressingRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    isPressingRef.current = true;
    onStartRecording();
  }, [disabled, onStartRecording]);

  const handlePointerUp = useCallback(() => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    onStopRecording();
  }, [onStopRecording]);

  const handlePointerLeave = useCallback(() => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    onStopRecording();
  }, [onStopRecording]);

  const isRecording = state === 'recording';
  const isConnecting = state === 'connecting';
  const isProcessing = state === 'processing';
  const isExecuting = state === 'executing';
  const isBusy = isConnecting || isProcessing || isExecuting;

  const getLabel = () => {
    if (isConnecting) return 'Conectando...';
    if (isRecording) return `Escuchando... ${recordingTimeLeft}s`;
    if (isProcessing) return 'Procesando...';
    if (isExecuting) return 'Ejecutando...';
    return 'Mantén presionado para hablar';
  };

  const getIcon = () => {
    if (isBusy) {
      return <Loader2 className="h-10 w-10 animate-spin" />;
    }
    return <Mic className="h-10 w-10" />;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Contenedor del botón con anillo animado */}
      <div className="relative">
        {/* Anillo pulsante durante grabación */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-50" />
        )}

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          disabled={disabled || isBusy}
          role="button"
          aria-label={getLabel()}
          className={cn(
            'relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 select-none touch-none',
            isRecording && 'bg-destructive text-destructive-foreground scale-110 shadow-lg shadow-destructive/40',
            isConnecting && 'bg-blue-600 text-white',
            isProcessing && 'bg-blue-600 text-white',
            isExecuting && 'bg-green-600 text-white',
            !isRecording && !isBusy && 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-lg',
            (disabled || isBusy) && 'opacity-60 cursor-not-allowed',
          )}
        >
          {getIcon()}
        </button>

        {/* Barra de progreso circular durante grabación */}
        {isRecording && (
          <svg
            className="absolute inset-0 -rotate-90 pointer-events-none"
            width="112"
            height="112"
            viewBox="0 0 112 112"
          >
            <circle
              cx="56"
              cy="56"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - recordingTimeLeft / 15)}`}
              className="text-destructive/60 transition-all duration-1000 ease-linear"
            />
          </svg>
        )}
      </div>

      {/* Label debajo del botón */}
      <p className={cn(
        'text-xs text-center',
        isRecording ? 'text-destructive font-medium' : 'text-muted-foreground',
      )}>
        {getLabel()}
      </p>
    </div>
  );
}
