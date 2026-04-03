/**
 * VoiceButton - Botón para iniciar comandos de voz
 * Fase 5: Componentes UI
 * 
 * Botón con icono de micrófono que:
 * - Inicia comandos de voz al hacer clic
 * - Muestra badge con comandos restantes
 * - Cambia visuales según el estado del agente
 * - Solo visible si feature flag está activo
 * - Dos variantes: header (desktop) y mobile (flotante)
 */

'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';
import { APP_CONFIG } from '@/lib/constants/config';
import { VoiceOverlay } from './VoiceOverlay';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VoiceButtonProps {
  variant?: 'header' | 'mobile';
}

export function VoiceButton({ variant = 'mobile' }: VoiceButtonProps) {
  const {
    state,
    isAvailable,
    startCommand,
    cancelCommand,
    commandsRemainingToday,
    isActive,
  } = useVoiceAgent();

  const [showOverlay, setShowOverlay] = useState(false);

  // Feature flag check
  if (!APP_CONFIG.enableVoiceAgent) {
    return null;
  }

  // Mostrar overlay cuando el agente está activo
  useEffect(() => {
    setShowOverlay(isActive);
  }, [isActive]);

  const handleClick = async () => {
    if (!isAvailable || isActive) return;

    try {
      await startCommand();
    } catch (error) {
      console.error('[VoiceButton] Error al iniciar comando:', error);
    }
  };

  const handleOverlayClose = () => {
    if (isActive) {
      cancelCommand();
    }
    setShowOverlay(false);
  };

  // Determinar icono según estado (tamaño ajustable)
  const getIcon = (size: 'sm' | 'lg' = 'lg') => {
    const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
    
    switch (state) {
      case 'recording':
        return <Mic className={iconClass} />;
      case 'processing':
      case 'connecting':
        return <Loader2 className={cn(iconClass, 'animate-spin')} />;
      case 'executing':
        return <CheckCircle2 className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      default:
        return <Mic className={iconClass} />;
    }
  };

  // Determinar color según estado
  const getButtonClasses = () => {
    if (!isAvailable) {
      return 'bg-muted text-muted-foreground cursor-not-allowed opacity-50';
    }

    switch (state) {
      case 'recording':
        return 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/50';
      case 'processing':
      case 'connecting':
        return 'bg-blue-600 text-white shadow-lg';
      case 'executing':
        return 'bg-green-600 text-white shadow-lg';
      case 'error':
        return 'bg-destructive text-destructive-foreground shadow-lg';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg';
    }
  };

  // Tooltip text
  const getTooltipText = () => {
    if (!isAvailable) {
      if (commandsRemainingToday === 0) {
        return 'Sin comandos disponibles hoy';
      }
      return 'Asistente de voz no disponible';
    }

    switch (state) {
      case 'recording':
        return 'Grabando...';
      case 'processing':
        return 'Procesando...';
      case 'executing':
        return 'Ejecutando acción...';
      case 'error':
        return 'Error en comando';
      default:
        return 'Asistente de voz';
    }
  };

  // Render para Header (desktop)
  if (variant === 'header') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleClick}
                disabled={!isAvailable || isActive}
                variant={state === 'idle' ? 'outline' : 'default'}
                size="sm"
                className={cn(
                  'gap-2 relative',
                  state === 'recording' && 'bg-destructive text-destructive-foreground animate-pulse',
                  state === 'processing' && 'bg-blue-600 text-white',
                  state === 'executing' && 'bg-green-600 text-white',
                  state === 'error' && 'bg-destructive text-destructive-foreground'
                )}
              >
                {getIcon('sm')}
                <span className="hidden xl:inline">Asistente de Voz</span>
                
                {/* Badge con comandos restantes */}
                {isAvailable && commandsRemainingToday > 0 && state === 'idle' && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {commandsRemainingToday}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipText()}</p>
              {isAvailable && state === 'idle' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {commandsRemainingToday} comando{commandsRemainingToday !== 1 ? 's' : ''} restante
                  {commandsRemainingToday !== 1 ? 's' : ''} hoy
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Overlay de voz */}
        {showOverlay && <VoiceOverlay onClose={handleOverlayClose} />}
      </>
    );
  }

  // Render para Mobile (flotante)
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
              {/* Badge con comandos restantes */}
              {isAvailable && commandsRemainingToday > 0 && state === 'idle' && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md z-10">
                  {commandsRemainingToday}
                </div>
              )}

              {/* Botón principal */}
              <button
                onClick={handleClick}
                disabled={!isAvailable || isActive}
                className={cn(
                  'w-14 h-14 rounded-full transition-all duration-300 flex items-center justify-center',
                  getButtonClasses()
                )}
                aria-label={getTooltipText()}
                aria-disabled={!isAvailable || isActive}
              >
                {getIcon('lg')}
              </button>

              {/* Anillo pulsante para estado recording */}
              {state === 'recording' && (
                <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-75" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{getTooltipText()}</p>
            {isAvailable && state === 'idle' && (
              <p className="text-xs text-muted-foreground mt-1">
                {commandsRemainingToday} comando{commandsRemainingToday !== 1 ? 's' : ''} restante
                {commandsRemainingToday !== 1 ? 's' : ''} hoy
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Overlay de voz */}
      {showOverlay && <VoiceOverlay onClose={handleOverlayClose} />}
    </>
  );
}
