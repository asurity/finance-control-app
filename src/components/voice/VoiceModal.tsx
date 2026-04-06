/**
 * VoiceModal - Modal conversacional para el agente de voz
 * 
 * Reemplaza a VoiceOverlay con:
 * - Botón push-to-talk grande central
 * - Historial de conversación scrollable (desde VoiceProvider context)
 * - Transcripción en vivo durante grabación
 * - Reproducción de audio TTS automática
 * - NO se auto-cierra: mantiene sesión hasta que el usuario cierra
 */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { VoicePushToTalkButton } from './VoicePushToTalkButton';
import { VoiceConversationHistory } from './VoiceConversationHistory';
import { toast } from 'sonner';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceModal({ isOpen, onClose }: VoiceModalProps) {
  const {
    state,
    transcript,
    error,
    recordingTimeLeft,
    commandsRemainingToday,
    isSessionActive,
    isRecording,
    conversationHistory,
    audioStream,
    currentExecutingTool,
    startRecording,
    stopRecording,
    endSession,
    prepareSession,
  } = useVoiceAgent();

  // Cargar cuentas y categorías para pre-loading de contexto
  const { currentOrgId } = useOrganization();
  const { useActiveAccounts } = useAccounts(currentOrgId || '');
  const { data: accounts } = useActiveAccounts();
  const { useAllCategories } = useCategories(currentOrgId || '');
  const { data: categories } = useAllCategories();

  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [hasShownDailyWelcome, setHasShownDailyWelcome] = useState(false);
  const [hasShownLowCommandsWarning, setHasShownLowCommandsWarning] = useState(false);

  // Audio element para TTS
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar cuando termina ejecución exitosa para mostrar acciones de éxito
  useEffect(() => {
    if (state === 'ready' && conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      
      // Si último mensaje fue del asistente (respuesta exitosa)
      if (lastMessage.role === 'assistant') {
        setShowSuccessActions(true);
        
        // Auto-cerrar en 3 segundos
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
        }
        autoCloseTimerRef.current = setTimeout(() => {
          endSession();
          onClose();
        }, 3000);
      }
    }

    // Limpiar timer al desmontar
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [state, conversationHistory, endSession, onClose]);

  // Función para cancelar auto-close y continuar conversando
  const handleContinue = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setShowSuccessActions(false);
  }, []);

  // Welcome message al abrir modal por primera vez del día
  useEffect(() => {
    if (isOpen && !hasShownDailyWelcome && commandsRemainingToday === 10) {
      toast.info('Tienes 10 comandos de voz disponibles hoy 🎤', {
        duration: 3000,
      });
      setHasShownDailyWelcome(true);
    }
  }, [isOpen, hasShownDailyWelcome, commandsRemainingToday]);

  // Warning cuando quedan pocos comandos
  useEffect(() => {
    if (isOpen && !hasShownLowCommandsWarning && commandsRemainingToday === 3) {
      toast.warning('Te quedan 3 comandos de voz hoy', {
        duration: 4000,
      });
      setHasShownLowCommandsWarning(true);
    }
  }, [isOpen, hasShownLowCommandsWarning, commandsRemainingToday]);

  // Pre-cargar contexto (cuentas y categorías) cuando modal se abre
  useEffect(() => {
    if (isOpen && !contextLoaded && accounts && categories) {
      try {
        const context = {
          accounts: accounts.map(a => ({
            id: a.id,
            name: a.name,
            balance: a.balance,
          })),
          categories: categories.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
          })),
          defaultAccountId: accounts[0]?.id || null,
        };
        
        localStorage.setItem('voice_context', JSON.stringify(context));
        setContextLoaded(true);
        console.log('[VoiceModal] Contexto pre-cargado:', context);
      } catch (err) {
        console.error('[VoiceModal] Error pre-cargando contexto:', err);
      }
    }
  }, [isOpen, accounts, categories, contextLoaded]);

  // Limpiar contexto al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      localStorage.removeItem('voice_context');
      setContextLoaded(false);
    }
  }, [isOpen]);

  // Pre-conectar sesión cuando se abre el modal (mejora UX - sin "Conectando" al presionar PTT)
  useEffect(() => {
    if (isOpen && !isSessionActive) {
      prepareSession().catch((err) => {
        console.error('[VoiceModal] Error precargando sesión:', err);
      });
    }
  }, [isOpen, isSessionActive, prepareSession]);

  // Conectar audio stream remoto al elemento <audio> para TTS
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioStream) return;

    audio.srcObject = audioStream;
    
    audio.play()
      .catch((err) => {
        // Fallback: autoplay bloqueado en algunos navegadores móviles
        // El texto se sigue mostrando en el historial de conversación
        console.warn('[VoiceModal] Autoplay bloqueado, fallback a solo texto:', err.message);
      });

    return () => {
      audio.srcObject = null;
    };
  }, [audioStream]);

  // Push-to-talk: iniciar grabación (conecta sesión automáticamente)
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (err) {
      console.error('[VoiceModal] Error al iniciar grabación:', err);
    }
  }, [startRecording]);

  // Push-to-talk: detener grabación
  const handleStopRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // Cerrar modal
  const handleClose = useCallback(() => {
    endSession();
    onClose();
  }, [endSession, onClose]);

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
  // Soporta tanto OpenAI (audioStream) como Gemini (speechSynthesis)
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

  // Detectar speechSynthesis (Gemini TTS) para indicador "IA hablando"
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    let checkInterval: NodeJS.Timeout;

    // Verificar cada 100ms si speechSynthesis está hablando
    checkInterval = setInterval(() => {
      const isSpeaking = window.speechSynthesis.speaking;
      setIsAISpeaking(isSpeaking);
    }, 100);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  if (!isOpen) return null;

  // UI especial cuando se agotan los comandos
  if (commandsRemainingToday === 0) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            'bg-card border border-border shadow-2xl w-full flex flex-col',
            'animate-in fade-in slide-in-from-bottom-4',
            'h-auto rounded-t-3xl pb-safe',
            'sm:max-w-md sm:rounded-2xl sm:pb-0',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-base font-semibold">Asistente de Voz</h3>
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

          {/* Contenido */}
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl mb-4">🎤</div>
            <h3 className="text-lg font-semibold mb-2">
              Comandos de voz agotados
            </h3>
            <p className="text-muted-foreground mb-4">
              Has usado tus 10 comandos de voz del día.
              <br />
              Disponible mañana a las 00:00.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-4 w-full">
              <p className="text-sm">
                💡 <strong>Tip:</strong> Registra transacciones manualmente desde el formulario
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Deshabilitar PTT cuando:
  // - Está conectando, procesando o ejecutando
  // - La IA está hablando (para evitar interrupciones)
  const isBusy = state === 'connecting' || state === 'processing' || state === 'executing' || isAISpeaking;

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
          // Mobile: PTT button arriba, más compacto, safe area para iPhones
          'h-[70vh] rounded-t-3xl pb-safe',
          // Desktop: centrado con tamaño fijo
          'sm:max-w-md sm:h-[600px] sm:rounded-2xl sm:pb-0',
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

        {/* MÓVIL: PTT button ARRIBA para fácil acceso con pulgar */}
        <div className="flex flex-col items-center py-6 border-b border-border sm:hidden">
          <VoicePushToTalkButton
            state={state}
            recordingTimeLeft={recordingTimeLeft}
            currentExecutingTool={currentExecutingTool}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={isBusy || commandsRemainingToday === 0}
          />
        </div>

        {/* Conversation History - Más compacto en móvil */}
        <VoiceConversationHistory
          messages={conversationHistory}
          isTranscribing={isRecording}
          currentTranscript={transcript}
          isAISpeaking={isAISpeaking}
        />

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
            <p className="text-sm font-medium text-destructive">{error.message}</p>
            {error.description && (
              <p className="text-xs text-destructive/80 mt-1">{error.description}</p>
            )}
            {error.recoveryAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={error.recoveryAction.handler}
                className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {error.recoveryAction.label}
              </Button>
            )}
          </div>
        )}

        {/* DESKTOP: PTT button abajo */}
        <div className="hidden sm:flex flex-col items-center py-4 border-t border-border shrink-0">
          <VoicePushToTalkButton
            state={state}
            recordingTimeLeft={recordingTimeLeft}
            currentExecutingTool={currentExecutingTool}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={isBusy || commandsRemainingToday === 0}
          />
        </div>

        {/* Acciones después de éxito */}
        {showSuccessActions && (
          <div className="flex gap-2 px-4 py-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="flex-1"
            >
              Cerrar (cierra en 3s)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleContinue}
              className="flex-1"
            >
              Otro comando
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">
            {commandsRemainingToday} comando{commandsRemainingToday !== 1 ? 's' : ''} restante{commandsRemainingToday !== 1 ? 's' : ''} hoy
          </p>
          {isSessionActive && (
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
