/**
 * VoiceModal - Modal conversacional para el agente de voz
 * 
 * Reemplaza a VoiceOverlay con:
 * - Botón push-to-talk grande central
 * - Historial de conversación scrollable
 * - Transcripción en vivo durante grabación
 * - Reproducción de audio TTS automática
 * - NO se auto-cierra: mantiene sesión hasta que el usuario cierra
 */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';
import { Button } from '@/components/ui/button';
import { VoicePushToTalkButton } from './VoicePushToTalkButton';
import { VoiceConversationHistory, type ConversationMessage } from './VoiceConversationHistory';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceModal({ isOpen, onClose }: VoiceModalProps) {
  const {
    state,
    transcript,
    response,
    error,
    recordingTimeLeft,
    commandsRemainingToday,
    startCommand,
    cancelCommand,
    forceCommitAudio,
    isRecording,
  } = useVoiceAgent();

  // Historial de conversación local al modal
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isSessionConnected, setIsSessionConnected] = useState(false);

  // Refs para tracking de mensajes
  const lastTranscriptRef = useRef('');
  const lastResponseRef = useRef('');
  const messageIdRef = useRef(0);

  // Audio element para TTS
  const audioRef = useRef<HTMLAudioElement>(null);

  const nextId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}`;
  }, []);

  // Agregar mensaje del usuario cuando termina de grabar (transcript final)
  useEffect(() => {
    if (
      state === 'processing' &&
      lastTranscriptRef.current !== transcript &&
      transcript.trim().length > 0
    ) {
      lastTranscriptRef.current = transcript;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'user',
          text: transcript,
          timestamp: new Date(),
        },
      ]);
    }
  }, [state, transcript, nextId]);

  // Agregar mensaje de la IA cuando llega respuesta final
  useEffect(() => {
    if (
      (state === 'executing' || state === 'ready' || state === 'idle') &&
      response.trim().length > 0 &&
      lastResponseRef.current !== response
    ) {
      lastResponseRef.current = response;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: response,
          timestamp: new Date(),
        },
      ]);
    }
  }, [state, response, nextId]);

  // Push-to-talk: iniciar grabación
  const handleStartRecording = useCallback(async () => {
    if (!isSessionConnected) {
      try {
        await startCommand();
        setIsSessionConnected(true);
      } catch (err) {
        console.error('[VoiceModal] Error al conectar sesión:', err);
        return;
      }
    }
    // En la siguiente fase (4), startRecording() será separado de startCommand()
    // Por ahora, startCommand() ya inicia la grabación
  }, [isSessionConnected, startCommand]);

  // Push-to-talk: detener grabación
  const handleStopRecording = useCallback(() => {
    if (isRecording) {
      forceCommitAudio();
    }
  }, [isRecording, forceCommitAudio]);

  // Cerrar modal
  const handleClose = useCallback(() => {
    if (isSessionConnected) {
      cancelCommand();
      setIsSessionConnected(false);
    }
    setMessages([]);
    lastTranscriptRef.current = '';
    lastResponseRef.current = '';
    messageIdRef.current = 0;
    onClose();
  }, [isSessionConnected, cancelCommand, onClose]);

  // Cerrar al hacer clic fuera (backdrop)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Detectar audio playback para indicador "IA hablando"
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsAISpeaking(true);
    const onEnded = () => setIsAISpeaking(false);
    const onPause = () => setIsAISpeaking(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  if (!isOpen) return null;

  const isBusy = state === 'connecting' || state === 'processing' || state === 'executing';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'bg-card border border-border shadow-2xl w-full flex flex-col',
          'transform transition-all duration-300 ease-out',
          'animate-in fade-in slide-in-from-bottom-4',
          // Mobile: fullscreen-like desde abajo
          'h-[85vh] rounded-t-2xl sm:rounded-2xl',
          // Desktop: centrado con tamaño fijo
          'sm:max-w-md sm:h-[600px]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Asistente de Voz</h3>
            {isAISpeaking && (
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            aria-label="Cerrar asistente de voz"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation History */}
        <VoiceConversationHistory
          messages={messages}
          isTranscribing={isRecording}
          currentTranscript={transcript}
          isAISpeaking={isAISpeaking}
        />

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Push-to-Talk Button */}
        <div className="flex flex-col items-center py-4 border-t border-border shrink-0">
          <VoicePushToTalkButton
            state={state}
            recordingTimeLeft={recordingTimeLeft}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={isBusy || commandsRemainingToday === 0}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">
            {commandsRemainingToday} comando{commandsRemainingToday !== 1 ? 's' : ''} restante{commandsRemainingToday !== 1 ? 's' : ''} hoy
          </p>
          {isSessionConnected && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-xs text-muted-foreground">Sesión activa</span>
            </div>
          )}
        </div>

        {/* Audio element oculto para TTS */}
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}
